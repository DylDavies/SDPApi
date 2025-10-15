import { Router } from 'express';
import { Singleton } from '../../../models/classes/Singleton';
import { LoggingService } from '../../../services/LoggingService';
import { authenticationMiddleware } from '../../../middleware/auth.middleware';
import { hasPermission } from '../../../middleware/permission.middleware';
import { EPermission } from '../../../models/enums/EPermission.enum';
import MUser from '../../../db/models/MUser.model';
import MEvent from '../../../db/models/MEvent.model';
import { MPayslip } from '../../../db/models/MPayslip.model';
import MMission from '../../../db/models/MMissions.model';
import MBundle from '../../../db/models/MBundle.model';
import MRole from '../../../db/models/MRole.model';
import { EUserType } from '../../../models/enums/EUserType.enum';

const router = Router();
const logger = Singleton.getInstance(LoggingService);

router.use(authenticationMiddleware);
router.use(hasPermission([EPermission.PLATFORM_STATS_VIEW]));

router.get('/platform', async (req, res) => {
    try {
        // USER STATISTICS
        // Find the Tutor role
        const tutorRole = await MRole.findOne({ name: 'Tutor' });
        const tutorRoleId = tutorRole?._id;

        // Total users by type and role
        const totalUsers = await MUser.countDocuments();
        const tutors = tutorRoleId
            ? await MUser.countDocuments({ type: EUserType.Staff, roles: tutorRoleId })
            : 0;
        const students = await MUser.countDocuments({ type: EUserType.Client });
        const admins = await MUser.countDocuments({ type: EUserType.Admin });

        // Pending approvals
        const pendingApprovals = await MUser.countDocuments({ pending: true });

        // New users over time (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const newUsersData = await MUser.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        const newUsersOverTime = newUsersData.map(item => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
            count: item.count
        }));

        // Tutor status distribution
        const tutorBaseQuery = tutorRoleId
            ? { type: EUserType.Staff, roles: tutorRoleId }
            : { type: EUserType.Staff };

        const activeTutors = await MUser.countDocuments({
            ...tutorBaseQuery,
            pending: false,
            disabled: false
        });

        const onLeaveTutors = await MUser.countDocuments({
            ...tutorBaseQuery,
            pending: false,
            disabled: false,
            'leave.approved': 'Approved',
            'leave.startDate': { $lte: new Date() },
            'leave.endDate': { $gte: new Date() }
        });

        const inactiveTutors = await MUser.countDocuments({
            ...tutorBaseQuery,
            $or: [
                { pending: true },
                { disabled: true }
            ]
        });

        // PLATFORM ACTIVITY
        // Total tutoring hours (only from remarked/completed events)
        const completedEvents = await MEvent.find({ remarked: { $eq: true } });
        logger.info(`Found ${completedEvents.length} remarked events for total hours calculation`);
        const totalMinutes = completedEvents.reduce((sum, event) => sum + event.duration, 0);
        const totalTutoringHours = totalMinutes / 60;
        logger.info(`Total minutes: ${totalMinutes}, Total hours: ${totalTutoringHours}`);

        // Most popular subjects by hours (top 10, only remarked events)
        const subjectData = await MEvent.aggregate([
            {
                $match: { remarked: { $eq: true } }
            },
            {
                $group: {
                    _id: '$subject',
                    totalMinutes: { $sum: '$duration' }
                }
            },
            {
                $sort: { totalMinutes: -1 }
            },
            {
                $limit: 10
            }
        ]);

        const mostPopularSubjects = subjectData.map(item => ({
            subject: item._id,
            count: parseFloat((item.totalMinutes / 60).toFixed(2)) // Convert minutes to hours
        }));

        // Active bundles
        const activeBundles = await MBundle.countDocuments({
            isActive: true
        });

        // Get all tutors for rating calculation (includes Staff and Admin users with Tutor role)
        const allTutors = tutorRoleId
            ? await MUser.find({ roles: tutorRoleId })
            : await MUser.find({ type: EUserType.Staff });

        // Overall tutor rating (only from remarked events with ratings)
        const tutorIds = allTutors.map(t => t._id);
        const ratedEvents = await MEvent.find({
            tutor: { $in: tutorIds },
            remarked: { $eq: true },
            rating: { $exists: true, $ne: null, $gt: 0 }
        });
        const overallTutorRating = ratedEvents.length > 0
            ? ratedEvents.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEvents.length
            : 0;

        // FINANCIAL OVERVIEW
        // Total payouts
        const allPayslips = await MPayslip.find();
        const totalPayouts = allPayslips.reduce((sum, p) => sum + (p.netPay || 0), 0);

        // TUTOR LEADERBOARD (only from remarked events)
        const leaderboardPromises = allTutors.map(async (tutor) => {
            const tutorEvents = await MEvent.find({ tutor: tutor._id, remarked: { $eq: true } });
            const totalMinutes = tutorEvents.reduce((sum, e) => sum + e.duration, 0);
            const totalHours = totalMinutes / 60;

            const ratedTutorEvents = tutorEvents.filter(e => e.rating && e.rating > 0);
            const averageRating = ratedTutorEvents.length > 0
                ? ratedTutorEvents.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedTutorEvents.length
                : 0;

            const missionsCompleted = await MMission.countDocuments({
                tutor: tutor._id,
                status: 'Completed'
            });

            return {
                tutorId: tutor._id.toString(),
                tutorName: tutor.displayName || 'Unknown',
                totalHours,
                averageRating,
                missionsCompleted
            };
        });

        let tutorLeaderboard = await Promise.all(leaderboardPromises);

        // Sort by total hours descending, then by average rating
        tutorLeaderboard = tutorLeaderboard
            .sort((a, b) => {
                if (b.totalHours !== a.totalHours) {
                    return b.totalHours - a.totalHours;
                }
                return b.averageRating - a.averageRating;
            })
            .slice(0, 20); // Top 20

        // Format response
        const platformStats = {
            userStatistics: {
                totalUsers,
                usersByType: {
                    tutors,
                    students,
                    admins
                },
                newUsersOverTime,
                pendingApprovals,
                tutorStatus: {
                    active: activeTutors,
                    onLeave: onLeaveTutors,
                    inactive: inactiveTutors
                }
            },
            platformActivity: {
                totalTutoringHours: parseFloat(totalTutoringHours.toFixed(2)),
                mostPopularSubjects,
                activeBundles,
                overallTutorRating: parseFloat(overallTutorRating.toFixed(2))
            },
            financialOverview: {
                totalPayouts: parseFloat(totalPayouts.toFixed(2))
            },
            tutorLeaderboard
        };

        return res.status(200).json(platformStats);
    } catch (error) {
        logger.error('Error fetching platform stats:', error);
        return res.status(500).send('Internal Server Error');
    }
});

export default router;
