import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import { Types } from "mongoose";
import MExtraWork, { IExtraWork, EExtraWorkStatus } from "../db/models/MExtraWork.model";

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
        return MExtraWork.findByIdAndUpdate(
            workId,
            { $set: { dateCompleted, status: EExtraWorkStatus.Completed } },
            { new: true }
        );
    }

    public async setExtraWorkStatus(workId: string, status: EExtraWorkStatus): Promise<IExtraWork | null> {
        return MExtraWork.findByIdAndUpdate(
            workId,
            { $set: { status } },
            { new: true }
        );
    }

    public async getExtraWorkForUser(userId: string): Promise<IExtraWork[]> {
        return MExtraWork.find({ userId: new Types.ObjectId(userId) })
            .populate('studentId', 'displayName')
            .populate('commissionerId', 'displayName')
            .exec();
    }
}

export default Singleton.getInstance(ExtraWorkService);