import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MBundle, { IBundle } from "../db/models/MBundle.model";
import { Types } from "mongoose";
import { EBundleStatus } from "../models/enums/EBundleStatus.enum";

/**
 * A service for managing bundles, which are packages for a student,
 * including subjects and hours.
 */
export class BundleService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Creates a new bundle for a single student with an initial set of subjects.
     * @param studentId The user ID for the student in the bundle.
     * @param subjects An array of objects, each defining a subject, its tutor, and hours.
     * @param creatorId The user ID of the person creating this bundle.
     * @returns The newly created bundle.
     */
    public async createBundle(studentId: string, subjects: { subject: string, tutor: string, hours: number }[], creatorId: string): Promise<IBundle> {
        const studentObjectId = new Types.ObjectId(studentId);
        const creatorObjectId = new Types.ObjectId(creatorId);

        const newBundle = new MBundle({
            student: studentObjectId,
            subjects,
            createdBy: creatorObjectId
        });

        await newBundle.save();
        return newBundle;
    }

    /**
     * Adds a new subject to a bundle.
     * @param bundleId The ID of the bundle to update.
     * @param subject The subject details to add.
     * @returns The updated bundle.
     */
    public async addSubjectToBundle(bundleId: string, subject: { subject: string, tutor: string, hours: number }): Promise<IBundle | null> {
        return MBundle.findByIdAndUpdate(
            bundleId,
            { $push: { subjects: subject } },
            { new: true }
        );
    }

    /**
     * Removes a subject from a bundle.
     * @param bundleId The ID of the bundle to update.
     * @param subjectId The ID of the subject to remove from the sub-document array.
     * @returns The updated bundle.
     */
    public async removeSubjectFromBundle(bundleId: string, subjectId: string): Promise<IBundle | null> {
        return MBundle.findByIdAndUpdate(
            bundleId,
            { $pull: { subjects: { _id: subjectId } } },
            { new: true }
        );
    }

    /**
     * Sets the active status of a bundle.
     * @param bundleId The ID of the bundle to update.
     * @param isActive Whether the bundle should be active or not.
     * @returns The updated bundle.
     */
    public async setBundleActiveStatus(bundleId: string, isActive: boolean): Promise<IBundle | null> {
        return MBundle.findByIdAndUpdate(
            bundleId,
            { $set: { isActive } },
            { new: true }
        );
    }

    /**
     * Updates the approval status of a bundle.
     * @param bundleId The ID of the bundle to update.
     * @param status The new status for the bundle.
     * @returns The updated bundle.
     */
    public async setBundleStatus(bundleId: string, status: EBundleStatus): Promise<IBundle | null> {
        return MBundle.findByIdAndUpdate(
            bundleId,
            { $set: { status } },
            { new: true }
        );
    }
}

export default Singleton.getInstance(BundleService);