import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MMission, {IMissions} from "../db/models/MMissions.model"; // Make sure to create this model file
import { Types } from "mongoose";
import { EMissionStatus } from "../models/enums/EMissions.enum"; // Make sure to create this enum file

/**
 * A service for managing missions, which are tasks assigned to students.
 */
export class MissionService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Retrieves all missions from the database and populates related user data.
     * @returns A promise that resolves to an array of all missions.
     */
    public async getMission(): Promise<IMissions[]> {
        return MMission.find()
            .populate('student', 'displayName')
            .populate('commissionedBy', 'displayName')
            .exec();
    }

    /**
     * Finds a single mission by its ID and populates related user data.
     * @param id The ID of the mission to find.
     * @returns A promise that resolves to the found IMission document or null.
     */
    public async getMissionById(id: string): Promise<IMissions | null> {
        return MMission.findById(id)
            .populate('student', 'displayName')
            .populate('commissionedBy', 'displayName')
            .exec();
    }
    /**
     * Finds all missions assigned to a specific student.
     * @param studentId The ID of the student.
     * @returns A promise that resolves to an array of the student's missions.
     */
    public async getMissionsByStudentId(studentId: string): Promise<IMissions[]> {
        return MMission.find({ student: studentId })
            .populate('student', 'displayName')
            .populate('tutor', 'displayName')
            .populate('commissionedBy', 'displayName')
            .exec();
    }
    public async getMissionsByBundleId(bundleId: string): Promise<IMissions[]> {
        return MMission.find({ bundleId: bundleId })
            .populate('student', 'displayName')
            .populate('tutor', 'displayName')
            .populate('commissionedBy', 'displayName')
            .exec();
    }

    /**
     * Creates a new mission.
     * @param missionData The data for the new mission.
     * @returns The newly created mission.
     */
    public async createMission(missionData: {
        bundleId: string;
        documentPath: string;
        documentName: string;
        studentId: string;
        tutorId: string;
        remuneration: number;
        commissionedById: string;
        dateCompleted: Date;
    }): Promise<IMissions> {
        const {bundleId, documentPath, documentName, studentId,tutorId, remuneration, commissionedById, dateCompleted } = missionData;

        const newMission = new MMission({
            bundleId: new Types.ObjectId(bundleId),
            documentPath,
            documentName,
            student: new Types.ObjectId(studentId),
            tutor: new Types.ObjectId(tutorId),
            remuneration,
            commissionedBy: new Types.ObjectId(commissionedById),
            dateCompleted,
            status: EMissionStatus.Active // Default status
        });

        await newMission.save();
        return newMission;
    }

    /**
     * Updates an existing mission with new data.
     * @param missionId The ID of the mission to update.
     * @param updateData An object containing the fields to update.
     * @returns The updated mission.
     */
    public async updateMission(missionId: string, updateData: Partial<IMissions>): Promise<IMissions | null> {
        return MMission.findByIdAndUpdate(
            missionId,
            { $set: updateData },
            { new: true } // This option returns the document after the update
        );
    }

    /**
     * Updates the status of a mission.
     * @param missionId The ID of the mission to update.
     * @param status The new status for the mission.
     * @returns The updated mission.
     */
    public async setMissionStatus(missionId: string, status: EMissionStatus): Promise<IMissions | null> {
        return MMission.findByIdAndUpdate(
            missionId,
            { $set: { status } },
            { new: true }
        );
    }

    /**
     * Deletes a mission by its ID.
     * @param missionId The ID of the mission to delete.
     * @returns The result of the delete operation.
     */
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
}

export default Singleton.getInstance(MissionService);