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

    /**
     * Creates a new extra work entry.
     * @param userId The user ID of the person submitting the work.
     * @param studentId The user ID of the student the work is for.
     * @param commissionerId The user ID of the person who commissioned the work.
     * @param workType The type of work.
     * @param details Details about the work.
     * @param remuneration The remuneration for the work.
     * @returns The newly created extra work entry.
     */
    public async createExtraWork(userId: string, studentId: string, commissionerId: string, workType: string, details: string, remuneration: number): Promise<IExtraWork> {
        const userIdObject = new Types.ObjectId(userId);
        const studentIdObject = new Types.ObjectId(studentId);
        const commissionerIdObject = new Types.ObjectId(commissionerId);

        const newExtraWork = new MExtraWork({
            userId: userIdObject,
            studentId: studentIdObject,
            commissionerId: commissionerIdObject,
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
            {
                $set: {
                    dateCompleted: dateCompleted,
                    status: EExtraWorkStatus.Completed
                }
            },
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