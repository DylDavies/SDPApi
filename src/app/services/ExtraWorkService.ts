import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import { Types } from "mongoose";
import MExtraWork, { IExtraWork, EExtraWorkStatus } from "../db/models/MExtraWork.model";
import PayslipService from "./PayslipService";
import notificationService from "./NotificationService";
import MUser from "../db/models/MUser.model";
import { generateEmailTemplate } from "../utils/emailTemplates";

export class ExtraWorkService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    public async createExtraWork(userId: string, studentId: string, commissionerId: string, workType: string, details: string, remuneration: number): Promise<IExtraWork> {
        const newExtraWork = new MExtraWork({
            userId: new Types.ObjectId(userId),
            studentId: new Types.ObjectId(studentId),
            commissionerId: new Types.ObjectId(commissionerId),
            workType,
            details,
            remuneration
        });

        await newExtraWork.save();

        // Notify the worker
        await notificationService.createNotification(
            userId,
            "Extra Work Assigned",
            `You've been assigned extra work: ${workType}. Remuneration: R${remuneration}`
        );

        return newExtraWork;
    }

    public async getExtraWork(): Promise<IExtraWork[]> {
        return MExtraWork.find()
            .populate('userId', 'displayName')
            .populate('studentId', 'displayName')
            .populate('commissionerId', 'displayName')
            .exec();
    }

    public async completeExtraWork(workId: string, dateCompleted: Date): Promise<IExtraWork | null> {
        const work = await MExtraWork.findByIdAndUpdate(
            workId,
            { $set: { dateCompleted, status: EExtraWorkStatus.Completed } },
            { new: true }
        );

        if (work && work.commissionerId) {
            // Notify commissioner that work is completed
            await notificationService.createNotification(
                typeof work.commissionerId === 'object' ? work.commissionerId.toString() : work.commissionerId,
                "Extra Work Completed",
                `Extra work (${work.workType}) has been marked as completed and is pending your approval.`
            );
        }

        return work;
    }

    public async setExtraWorkStatus(workId: string, status: EExtraWorkStatus): Promise<IExtraWork | null> {
        if (status == EExtraWorkStatus.Approved) {
            const work = await MExtraWork.findById(workId).populate('studentId', 'displayName');

            if (!work) return null;

            // Check if dateCompleted exists before trying to approve
            if (!work.dateCompleted) {
                throw new Error('Cannot approve work that has not been marked as completed');
            }

            const year = work.dateCompleted.getFullYear();
            const month = (work.dateCompleted.getMonth() + 1).toString().padStart(2, '0');
            const payPeriod = `${year}-${month}`;

            const payslip = await PayslipService.getOrCreateDraftPayslip(work.userId, payPeriod);

            const studentName = (work.studentId as unknown as {displayName: string}).displayName;

            await PayslipService.addBonus(new Types.ObjectId(payslip.id), `EWA - ${work.workType} for ${studentName}`, work.remuneration);

            // Notify worker of approval with email
            const user = await MUser.findById(work.userId);
            if (user) {
                const content = `
                    <p>Hi ${user.displayName},</p>
                    <p>Your extra work has been approved!</p>
                    <div class="highlight">
                        <p><strong>Work Type:</strong> ${work.workType}</p>
                        <p><strong>Remuneration:</strong> R${work.remuneration}</p>
                        <p><strong>Pay Period:</strong> ${payPeriod}</p>
                    </div>
                    <p>The remuneration has been added as a bonus to your payslip.</p>
                `;

                const html = generateEmailTemplate(
                    'Extra Work Approved',
                    content,
                    { text: 'View Payslips', url: `${process.env.FRONTEND_URL}/dashboard/payslips` }
                );

                await notificationService.createNotification(
                    work.userId.toString(),
                    "Extra Work Approved",
                    `Your extra work (${work.workType}) has been approved. R${work.remuneration} added to your payslip.`,
                    true,
                    html
                );
            }
        } else if (status == EExtraWorkStatus.Denied) {
            const work = await MExtraWork.findById(workId);
            if (work) {
                // Notify worker of rejection with email
                const user = await MUser.findById(work.userId);
                if (user) {
                    const content = `
                        <p>Hi ${user.displayName},</p>
                        <p>Your extra work submission has been denied.</p>
                        <div class="highlight">
                            <p><strong>Work Type:</strong> ${work.workType}</p>
                        </div>
                        <p>Please contact your manager for more information.</p>
                    `;

                    const html = generateEmailTemplate(
                        'Extra Work Denied',
                        content
                    );

                    await notificationService.createNotification(
                        work.userId.toString(),
                        "Extra Work Denied",
                        `Your extra work (${work.workType}) has been nied. Please contact your manager.`,
                        true,
                        html
                    );
                }
            }
        }

        return MExtraWork.findByIdAndUpdate(
            workId,
            { $set: { status } },
            { new: true }
        );
    }

    public async getExtraWorkForUser(userId: string): Promise<IExtraWork[]> {
        return MExtraWork.find({
            $or: [
                { userId: new Types.ObjectId(userId) },
                { commissionerId: new Types.ObjectId(userId) }
            ]
        })
            .populate('userId', 'displayName')
            .populate('studentId', 'displayName')
            .populate('commissionerId', 'displayName')
            .exec();
    }
}

export default Singleton.getInstance(ExtraWorkService);