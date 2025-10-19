import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MMission, { IMissions } from "../db/models/MMissions.model";
import { Types } from "mongoose";
import { EMissionStatus } from "../models/enums/EMissions.enum";
import PayslipService from "./PayslipService";
import notificationService from "./NotificationService";
import MUser from "../db/models/MUser.model";
import { generateEmailTemplate, formatDate } from "../utils/emailTemplates";

export class MissionService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    public async getMission(): Promise<IMissions[]> {
        await this.updateExpiredMissions();
        return MMission.find()
            .populate('student', 'displayName')
            .populate('commissionedBy', 'displayName')
            .populate('document') // Populate the document details
            .exec();
    }

    public async getMissionById(id: string): Promise<IMissions | null> {
        await this.updateExpiredMissions();
        return MMission.findById(id)
            .populate('student', 'displayName')
            .populate('commissionedBy', 'displayName')
            .populate('document') // Populate the document details
            .exec();
    }

    public async getMissionsByStudentId(studentId: string): Promise<IMissions[]> {
        await this.updateExpiredMissions();
        return MMission.find({ student: studentId })
            .populate('student', 'displayName')
            .populate('tutor', 'displayName')
            .populate('commissionedBy', 'displayName')
            .populate('document') // Populate the document details
            .exec();
    }

    public async getMissionsByBundleId(bundleId: string): Promise<IMissions[]> {
        await this.updateExpiredMissions();
        return MMission.find({ bundleId: bundleId })
            .populate('student', 'displayName')
            .populate('tutor', 'displayName')
            .populate('commissionedBy', 'displayName')
            .populate('document') // Populate the document details
            .exec();
    }

    public async createMission(missionData: {
        bundleId: string;
        documentId: string; // Changed from documentPath and documentName
        studentId: string;
        tutorId: string;
        remuneration: number;
        commissionedById: string;
        dateCompleted: Date;
    }): Promise<IMissions> {
        const { bundleId, documentId, studentId, tutorId, remuneration, commissionedById, dateCompleted } = missionData;

        const newMission = new MMission({
            bundleId: new Types.ObjectId(bundleId),
            document: new Types.ObjectId(documentId), // Use documentId
            student: new Types.ObjectId(studentId),
            tutor: new Types.ObjectId(tutorId),
            remuneration,
            commissionedBy: new Types.ObjectId(commissionedById),
            dateCompleted,
            status: EMissionStatus.Active
        });

        await newMission.save();

        // Notify tutor about new mission
        const tutor = await MUser.findById(tutorId);
        if (tutor) {
            const content = `
                <p>Hi ${tutor.displayName},</p>
                <p>You've been assigned a new mission!</p>
                <div class="highlight">
                    <p><strong>Remuneration:</strong> R${remuneration} per hour</p>
                    <p><strong>Target Completion Date:</strong> ${formatDate(dateCompleted)}</p>
                </div>
                <p>Complete this mission to earn bonus payments.</p>
            `;

            const html = generateEmailTemplate(
                'New Mission Assigned',
                content,
                { text: 'View Missions', url: `${process.env.FRONTEND_URL}/dashboard` }
            );

            await notificationService.createNotification(
                tutorId,
                "New Mission Assigned",
                `You've been assigned a new mission with R${remuneration}/hour remuneration.`,
                true,
                html
            );
        }

        return newMission;
    }

    public async updateMission(missionId: string, updateData: Partial<IMissions>): Promise<IMissions | null> {
        const originalMission = await MMission.findById(missionId);

        if (updateData.status && updateData.status == EMissionStatus.Achieved) {
            const mission = await MMission.findById(missionId).populate('student', 'displayName');

            if (!mission || mission.status == EMissionStatus.Achieved) return null;

            const today = new Date();
            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const payPeriod = `${year}-${month}`;

            const payslip = await PayslipService.getOrCreateDraftPayslip(mission.tutor, payPeriod);

            const amount = mission.hoursCompleted * mission.remuneration;

            await PayslipService.addBonus(payslip.id, `Achieved Mission for ${(mission.student as unknown as {displayName: string}).displayName}`, amount);

            // Notify tutor of mission achievement
            const tutor = await MUser.findById(mission.tutor);
            if (tutor) {
                const content = `
                    <p>Hi ${tutor.displayName},</p>
                    <p>Congratulations! Your mission has been marked as achieved!</p>
                    <div class="highlight">
                        <p><strong>Bonus Amount:</strong> R${amount}</p>
                        <p><strong>Pay Period:</strong> ${payPeriod}</p>
                    </div>
                    <p>The bonus has been added to your payslip.</p>
                `;

                const html = generateEmailTemplate(
                    'Mission Achieved!',
                    content,
                    { text: 'View Payslip', url: `${process.env.FRONTEND_URL}/dashboard/payslips` }
                );

                await notificationService.createNotification(
                    mission.tutor.toString(),
                    "Mission Achieved",
                    `Congratulations! You've achieved your mission. Bonus of R${amount} added to your payslip.`,
                    true,
                    html
                );
            }
        } else if (originalMission) {
            // Notify tutor of mission updates (non-achieved status changes)
            await notificationService.createNotification(
                originalMission.tutor.toString(),
                "Mission Updated",
                "Your mission has been updated. Please check the details."
            );
        }

        return MMission.findByIdAndUpdate(
            missionId,
            { $set: updateData },
            { new: true }
        ).populate('document');
    }

    public async setMissionStatus(missionId: string, status: EMissionStatus): Promise<IMissions | null> {
        return MMission.findByIdAndUpdate(
            missionId,
            { $set: { status } },
            { new: true }
        ).populate('document');
    }

    public async deleteMission(missionId: string): Promise<{ deletedCount?: number }> {
        const result = await MMission.deleteOne({ _id: missionId }).exec();
        return { deletedCount: result.deletedCount };
    }
   /**
     * Finds a single mission by its bundleId and tutorId.
     * @param bundleId The ID of the bundle.
     * @param tutorId The ID of the tutor.
     * @returns A promise that resolves to the found IMission document or null.
     */
    public async findMissionByBundleAndTutor(bundleId: string, tutorId: string): Promise<IMissions | null> {
        return MMission.findOne({ 
            bundleId: new Types.ObjectId(bundleId), 
            tutor: new Types.ObjectId(tutorId) 
        }).exec();
    }
    
    /**
     * Updates the hours of a mission.
     * @param missionId The ID of the mission to update.
     * @param hours The number of hours to the mission.
     * @returns The updated mission.
     */
    public async updateMissionHours(missionId: string, hours: number): Promise<IMissions | null> {
        return MMission.findByIdAndUpdate(
            missionId,
            { $set: { hoursCompleted: hours } },
            { new: true }
        );
    }

    /**
     * Updates all missions that have passed their due date and are still active to 'completed' status.
     * This method is called automatically when retrieving missions.
     * @private
     */
    private async updateExpiredMissions(): Promise<void> {
        const now = new Date();

        // Find missions that will be marked as expired
        const expiredMissions = await MMission.find({
            dateCompleted: { $lt: now },
            status: EMissionStatus.Active
        }).exec();

        // Update them
        await MMission.updateMany(
            {
                dateCompleted: { $lt: now },
                status: EMissionStatus.Active
            },
            {
                $set: { status: EMissionStatus.Completed }
            }
        ).exec();

        // Notify tutors and commissioners about expired missions
        for (const mission of expiredMissions) {
            // Notify tutor
            if (mission.tutor) {
                await notificationService.createNotification(
                    typeof mission.tutor === 'object' ? mission.tutor.toString() : mission.tutor,
                    "Mission Expired",
                    "One of your missions has reached its completion date without being achieved."
                );
            }

            // Notify commissioner
            if (mission.commissionedBy) {
                await notificationService.createNotification(
                    typeof mission.commissionedBy === 'object' ? mission.commissionedBy.toString() : mission.commissionedBy,
                    "Mission Expired",
                    "A mission you commissioned has expired without being achieved."
                );
            }
        }
    }
}

export default Singleton.getInstance(MissionService);