import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MMission, { IMissions } from "../db/models/MMissions.model";
import { Types } from "mongoose";
import { EMissionStatus } from "../models/enums/EMissions.enum";

export class MissionService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    public async getMission(): Promise<IMissions[]> {
        return MMission.find()
            .populate('student', 'displayName')
            .populate('commissionedBy', 'displayName')
            .populate('document') // Populate the document details
            .exec();
    }

    public async getMissionById(id: string): Promise<IMissions | null> {
        return MMission.findById(id)
            .populate('student', 'displayName')
            .populate('commissionedBy', 'displayName')
            .populate('document') // Populate the document details
            .exec();
    }

    public async getMissionsByStudentId(studentId: string): Promise<IMissions[]> {
        return MMission.find({ student: studentId })
            .populate('student', 'displayName')
            .populate('tutor', 'displayName')
            .populate('commissionedBy', 'displayName')
            .populate('document') // Populate the document details
            .exec();
    }

    public async getMissionsByBundleId(bundleId: string): Promise<IMissions[]> {
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
        return newMission;
    }

    public async updateMission(missionId: string, updateData: Partial<IMissions>): Promise<IMissions | null> {
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
}

export default Singleton.getInstance(MissionService);