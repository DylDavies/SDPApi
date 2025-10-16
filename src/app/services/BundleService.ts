import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MBundle, { IBundle, IAddress } from "../db/models/MBundle.model";
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
     * Retrieves all bundles from the database.
     * @returns A promise that resolves to an array of all bundles.
     */
    public async getBundles(): Promise<IBundle[]> {

        return MBundle.find()
            .populate('student', 'displayName')
            .populate('subjects.tutor', 'displayName')
            .populate('createdBy', 'displayName')
            .populate('manager', 'displayName')
            .populate('stakeholders', 'displayName')
            .exec();
    }

    /**
     * Retrieves bundles where the user is involved as a tutor, manager, or stakeholder.
     * @param userId The ID of the user.
     * @returns A promise that resolves to an array of bundles.
     */
    public async getBundlesByUser(userId: string): Promise<IBundle[]> {
        const userObjectId = new Types.ObjectId(userId);

        return MBundle.find({
            $or: [
                { 'subjects.tutor': userObjectId },
                { 'manager': userObjectId },
                { 'stakeholders': userObjectId }
            ]
        })
            .populate('student', 'displayName')
            .populate('subjects.tutor', 'displayName')
            .populate('createdBy', 'displayName')
            .populate('manager', 'displayName')
            .populate('stakeholders', 'displayName')
            .exec();
    }
    /**
 * Finds a single bundle by its ID and populates the student and tutor details.
 * @param id The ID of the bundle to find.
 * @returns A promise that resolves to the found IBundle document or null.
 */
    public async getBundleById(id: string): Promise<IBundle | null> {
        return MBundle.findById(id)
            .populate('student', 'displayName')
            .populate('subjects.tutor', 'displayName')
            .populate('createdBy', 'displayName')
            .populate('manager', 'displayName')
            .populate('stakeholders', 'displayName')
            .exec();
    }

    /**
     * Updates an existing bundle with new data.
     * @param bundleId The ID of the bundle to update.
     * @param updateData An object containing the fields to update.
     * @returns The updated bundle.
     */
    public async updateBundle(bundleId: string, updateData: Partial<IBundle>): Promise<IBundle | null> {
        return MBundle.findByIdAndUpdate(
            bundleId,
            { $set: updateData },
            { new: true }
        );
    }

    /**
     * Creates a new bundle for a single student with an initial set of subjects.
     * @param studentId The user ID for the student in the bundle.
     * @param subjects An array of objects, each defining a subject, its tutor, and duration.
     * @param creatorId The user ID of the person creating this bundle.
     * @param lessonLocation Optional structured address where lessons will take place.
     * @param managerId Optional ID of the staff member managing this bundle.
     * @param stakeholderIds Optional array of user IDs who are stakeholders in this bundle.
     * @returns The newly created bundle.
     */
    public async createBundle(
        studentId: string,
        subjects: { subject: string, grade: string, tutor: string, durationMinutes: number }[],
        creatorId: string,
        lessonLocation?: IAddress,
        managerId?: string,
        stakeholderIds?: string[]
    ): Promise<IBundle> {
        // Validate no duplicate tutor-subject combinations
        const tutorSubjectPairs = new Set<string>();
        for (const subject of subjects) {
            const key = `${subject.tutor}-${subject.subject}`;
            if (tutorSubjectPairs.has(key)) {
                throw new Error(`Duplicate tutor-subject combination found: tutor ${subject.tutor} is already assigned to subject ${subject.subject} in this bundle.`);
            }
            tutorSubjectPairs.add(key);
        }

        const studentObjectId = new Types.ObjectId(studentId);
        const creatorObjectId = new Types.ObjectId(creatorId);

        // Map through subjects to convert tutor ID strings to ObjectIds
        const formattedSubjects = subjects.map(subject => ({
            ...subject,
            tutor: new Types.ObjectId(subject.tutor)
        }));

        const bundleData: any = {
            student: studentObjectId,
            subjects: formattedSubjects,
            createdBy: creatorObjectId,
            stakeholders: stakeholderIds ? stakeholderIds.map(id => new Types.ObjectId(id)) : []
        };

        if (lessonLocation) {
            bundleData.lessonLocation = lessonLocation;
        }

        if (managerId) {
            bundleData.manager = new Types.ObjectId(managerId);
        }

        const newBundle = new MBundle(bundleData);

        await newBundle.save();
        return newBundle;
    }

    /**
     * Adds a new subject to a bundle.
     * @param bundleId The ID of the bundle to update.
     * @param subject The subject details to add.
     * @returns The updated bundle.
     */
    public async addSubjectToBundle(bundleId: string, subject: { subject: string, grade: string, tutor: string, durationMinutes: number }): Promise<IBundle | null> {
        // First, get the bundle to check for duplicates
        const bundle = await MBundle.findById(bundleId);
        if (!bundle) {
            return null;
        }

        // Check if this tutor-subject combination already exists
        const isDuplicate = bundle.subjects.some(existingSubject =>
            existingSubject.tutor.toString() === subject.tutor &&
            existingSubject.subject === subject.subject
        );

        if (isDuplicate) {
            throw new Error(`Duplicate tutor-subject combination: tutor ${subject.tutor} is already assigned to subject ${subject.subject} in this bundle.`);
        }

        const subjectWithObjectId = {
            ...subject,
            tutor: new Types.ObjectId(subject.tutor)
        };
        return MBundle.findByIdAndUpdate(
            bundleId,
            { $push: { subjects: subjectWithObjectId } },
            { new: true }
        );
    }

    /**
     * Removes a subject from a bundle by its ID.
     * @param bundleId The ID of the bundle to update.
     * @param subjectId The ID of the subject entry to remove.
     * @returns The updated bundle, or null if the bundle was not found. Throws an error if the subject is not found.
     */
    public async removeSubjectFromBundle(bundleId: string, subjectId: string): Promise<IBundle | null> {
        const bundle = await MBundle.findById(bundleId);
        if (!bundle) {
            return null;
        }

        const subjectExists = bundle.subjects.some(s => s._id?.toString() === subjectId);
        if (!subjectExists) {
            throw new Error(`Subject with id "${subjectId}" not found in this bundle.`);
        }

        bundle.subjects = bundle.subjects.filter(s => s._id?.toString() !== subjectId);
        await bundle.save();
        return bundle;
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