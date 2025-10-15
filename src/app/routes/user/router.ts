import { Router } from 'express';
import { Singleton } from '../../models/classes/Singleton';
import { LoggingService } from '../../services/LoggingService';
import { UserService } from '../../services/UserService';
import { IUser } from '../../db/models/MUser.model';
import { authenticationMiddleware } from '../../middleware/auth.middleware';
import IPayloadUser from '../../models/interfaces/IPayloadUser.interface';
import MEvent from '../../db/models/MEvent.model';
import { MPayslip } from '../../db/models/MPayslip.model';
import MMission from '../../db/models/MMissions.model';
import MUser from '../../db/models/MUser.model';
import { Types } from 'mongoose';
import { ELeave } from '../../models/enums/ELeave.enum';
import { EMissionStatus } from '../../models/enums/EMissions.enum';

const router = Router();
const userService = Singleton.getInstance(UserService);
const logger = Singleton.getInstance(LoggingService);

router.use(authenticationMiddleware);

router.get('/', async (req, res) => {
    try{
        const { id } =  req.user as IPayloadUser;
        const user = await userService.getUser(id);

        if(!user){
            logger.error("User was not returned");
            return res.status(404).send("User not found");
        }

        return res.status(200).json(user);
    } catch (error){
        logger.error(`Error fetching user.`, error);
        return res.status(500).send('Internal Server Error');
    }
})

router.patch('/', async (req,res) => {
    try{
        const { id } = req.user as IPayloadUser;
        const updateData: Partial<IUser> = req.body;

        //data cleaning 
        delete updateData.googleId;
        delete (updateData as Partial<IUser>).createdAt;
        delete (updateData as Partial<IUser>)._id;

        if(Object.keys(updateData).length === 0){
            return res.status(400).send("No valid fields provided");
        }

        const updatedUser = await userService.editUser(id, updateData);

        if(!updatedUser){
            return res.status(404).send("Updated user not found")
        }

        return res.status(200).json(updatedUser);
        
    } catch(error){
        logger.error(`Error updating user.`, error);
        return res.status(500).send('Internal Server Error');
    }
})

router.patch('/preferences', async (req, res) => {
    try {
        const userId = req.user!.id;
        const { theme } = req.body;

        // Validate the theme input
        if (!['light', 'dark', 'system'].includes(theme)) {
            return res.status(400).send('Invalid theme value.');
        }

        await userService.updateUserPreferences(userId, {theme});

        res.status(200).json({ message: 'Preferences updated successfully.' });
    } catch (error) {
        logger.error(`Error updating user preferences.`, error);
        return res.status(500).send('Internal Server Error' );
    }
});

router.get('/stats/:tutorId', async (req, res) => {
    try {
        const { tutorId } = req.params;
        const tutorObjectId = new Types.ObjectId(tutorId);

        // Fetch user with populated badges to get leave data and badge history
        const user = await MUser.findById(tutorObjectId).populate('badges.badge').exec();
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Get all events for this tutor
        const events = await MEvent.find({ tutor: tutorObjectId })
            .populate('student', 'displayName')
            .sort({ startTime: -1 })
            .exec();

        // Calculate total hours taught
        const totalMinutes = events.reduce((sum, event) => sum + event.duration, 0);
        const totalHours = totalMinutes / 60;

        // Calculate average rating
        const ratedEvents = events.filter(e => e.rating !== undefined && e.rating !== null);
        const averageRating = ratedEvents.length > 0
            ? ratedEvents.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEvents.length
            : 0;

        // Get achieved missions count
        const completedMissions = await MMission.countDocuments({
            tutor: tutorObjectId,
            status: EMissionStatus.Achieved
        });

        // Get all payslips for net pay calculation
        const payslips = await MPayslip.find({ userId: tutorObjectId }).sort({ payPeriod: 1 });
        const totalNetPay = payslips.reduce((sum, payslip) => sum + (payslip.netPay || 0), 0);

        // Calculate hours taught per subject for pie chart
        const subjectHours: { [key: string]: number } = {};
        events.forEach(event => {
            const hours = event.duration / 60;
            if (!subjectHours[event.subject]) {
                subjectHours[event.subject] = 0;
            }
            subjectHours[event.subject] += hours;
        });

        // Calculate monthly earnings for line chart
        const monthlyEarnings: { [key: string]: number } = {};
        payslips.forEach(payslip => {
            const month = payslip.payPeriod; // Format: "YYYY-MM" or similar
            monthlyEarnings[month] = payslip.netPay || 0;
        });

        // Get recent activity (past week)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentEvents = await MEvent.find({
            tutor: tutorObjectId,
            startTime: { $gte: oneWeekAgo }
        })
            .populate('student', 'displayName')
            .sort({ startTime: -1 })
            .limit(20)
            .exec();

        // Count approved leave days in current year
        const currentYear = new Date().getFullYear();
        const approvedLeave = user.leave?.filter(leave =>
            leave.approved === ELeave.Approved &&
            new Date(leave.startDate).getFullYear() === currentYear
        ) || [];

        const leaveDaysCount = approvedLeave.reduce((total, leave) => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return total + days;
        }, 0);

        // Get badge history with null checking
        const badgeHistory = (user.badges || [])
            .filter(userBadge => userBadge.badge && typeof userBadge.badge === 'object')
            .map(userBadge => {
                const badgeObj = userBadge.badge as any;
                return {
                    badge: {
                        _id: badgeObj._id || '',
                        name: badgeObj.name || 'Unknown Badge',
                        TLA: badgeObj.TLA || '',
                        image: badgeObj.image || '',
                        description: badgeObj.description || ''
                    },
                    dateAdded: userBadge.dateAdded
                };
            })
            .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

        // Format response
        const stats = {
            kpis: {
                totalHoursTaught: parseFloat(totalHours.toFixed(2)),
                netPay: parseFloat(totalNetPay.toFixed(2)),
                averageRating: parseFloat(averageRating.toFixed(2)),
                missionsCompleted: completedMissions
            },
            charts: {
                hoursPerSubject: Object.entries(subjectHours).map(([subject, hours]) => ({
                    subject,
                    hours: parseFloat(hours.toFixed(2))
                })),
                monthlyEarnings: Object.entries(monthlyEarnings).map(([month, earnings]) => ({
                    month,
                    earnings: parseFloat(earnings.toFixed(2))
                }))
            },
            recentActivity: recentEvents.map(event => ({
                _id: event._id,
                student: (event.student as any)?.displayName || 'Unknown',
                subject: event.subject,
                duration: event.duration,
                startTime: event.startTime,
                remarked: event.remarked
            })),
            leaveDaysTaken: leaveDaysCount,
            badgeHistory
        };

        return res.status(200).json(stats);
    } catch (error) {
        logger.error('Error fetching tutor stats:', error);
        return res.status(500).send('Internal Server Error');
    }
});

export default router;

