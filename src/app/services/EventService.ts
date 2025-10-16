import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MEvent, { IEvent } from "../db/models/MEvent.model";
import MBundle from "../db/models/MBundle.model";
import { EUserType } from "../models/enums/EUserType.enum";
import MUser from "../db/models/MUser.model";
/**
 * A service for managing calendar events.
 */
export class EventService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    public async init(): Promise<void> {
        return Promise.resolve();
    }
    
    public async rateEvent(eventId: string, rating: number): Promise<IEvent | null> {
        const event = await MEvent.findById(eventId);
        if (!event) {
            throw new Error("Event not found.");
        }
        if (event.rating) {
            throw new Error("This event has already been rated.");
        }
        return MEvent.findByIdAndUpdate(eventId, { rating }, { new: true });
    }

    /**
    * Creates a new event and deducts the duration from the corresponding subject in the bundle.
    * @param {string} bundleId - The ID of the bundle.
    * @param {string} studentId - The ID of the student.
    * @param {string} tutorId - The ID of the tutor.
    * @param {string} subject - The subject of the event.
    * @param {Date} startTime - The start time of the event.
    * @param {number} durationInMinutes - The duration of the event in minutes.
    * @returns {Promise<IEvent>} The created event.
    */
    public async createEvent(bundleId: string, studentId: string, tutorId: string, subject: string, startTime: Date, durationInMinutes: number): Promise<IEvent> {
        const bundle = await MBundle.findById(bundleId);
        if (!bundle) {
            throw new Error("Bundle not found.");
        }

        const subjectInBundle = bundle.subjects.find(s => s.subject === subject);
        if (!subjectInBundle) {
            throw new Error("Subject not found in this bundle.");
        }

        if (durationInMinutes > subjectInBundle.durationMinutes) {
            throw new Error(`Event duration exceeds the remaining time for this subject. Remaining time: ${subjectInBundle.durationMinutes} minutes.`);
        }

        // Deduct the time from the bundle
        subjectInBundle.durationMinutes -= durationInMinutes;
        await bundle.save();

        const newEvent = await MEvent.create({
            bundle: bundleId,
            student: studentId,
            tutor: tutorId,
            subject,
            startTime,
            duration: durationInMinutes
        });

      

        return newEvent;
    }
    
    /**
     * Retrieves all events for a given user (tutor or student).
     * @param {string} userId - The ID of the user.
     * @returns {Promise<IEvent[]>} A list of events.
     */
    public async getEvents(userId: string): Promise<IEvent[]> {
        const user = await MUser.findById(userId);
        if (!user) {
            return [];
        }
    
        if (user.type === EUserType.Client) {
            return MEvent.find({ student: userId })
                .populate('student', 'displayName')
                .populate('tutor', 'displayName')
                .exec();
        } else {
            // For staff, find all students they are tutoring
            const bundles = await MBundle.find({ 'subjects.tutor': userId });
            const studentIds = [...new Set(bundles.map(b => b.student.toString()))];
    
            // Return events where the user is the tutor OR the student is one of the students they tutor
            return MEvent.find({
                $or: [
                    { tutor: userId },
                    { student: { $in: studentIds } }
                ]
            })
            .populate('student', 'displayName')
            .populate('tutor', 'displayName')
            .exec();
        }
    }

    /**
     * Updates an existing event and adjusts the bundle duration.
     * @param {string} eventId - The ID of the event to update.
     * @param {Partial<IEvent>} eventData - The data to update the event with.
     * @returns {Promise<IEvent | null>} The updated event.
     */
    public async updateEvent(eventId: string, eventData: Partial<IEvent>): Promise<IEvent | null> {
        const originalEvent = await MEvent.findById(eventId);
        if (!originalEvent) {
            throw new Error("Event not found.");
        }
    
        const bundle = await MBundle.findById(originalEvent.bundle);
        if (bundle) {
            const subjectInBundle = bundle.subjects.find(s => s.subject === originalEvent.subject);
            if (subjectInBundle) {
                const durationDifference = (eventData.duration || originalEvent.duration) - originalEvent.duration;
    
                if (durationDifference > subjectInBundle.durationMinutes) {
                    throw new Error("Event duration exceeds the remaining time for this subject.");
                }
    
                subjectInBundle.durationMinutes -= durationDifference;
                await bundle.save();
            }
        }
    
        return MEvent.findByIdAndUpdate(eventId, eventData, { new: true });
    }

    /**
     * Deletes an event and refunds the duration to the bundle.
     * @param {string} eventId - The ID of the event to delete.
     * @returns {Promise<void>}
     */
    public async deleteEvent(eventId: string): Promise<void> {
        const event = await MEvent.findByIdAndDelete(eventId);
        if (!event) {
            throw new Error("Event not found.");
        }

        const bundle = await MBundle.findById(event.bundle);
        if (bundle) {
            const subjectInBundle = bundle.subjects.find(s => s.subject === event.subject);
            if (subjectInBundle) {
                subjectInBundle.durationMinutes += event.duration;
                await bundle.save();
            }
        }
    }

    /**
     * Retrieves all events for a given bundle.
     * @param {string} bundleId - The ID of the bundle.
     * @returns {Promise<IEvent[]>} A list of events for the bundle.
     */
    public async getEventsByBundle(bundleId: string): Promise<IEvent[]> {
        return MEvent.find({ bundle: bundleId })
            .populate('student', 'displayName')
            .populate('tutor', 'displayName')
            .sort({ startTime: -1 })
            .exec();
    }
}

export default Singleton.getInstance(EventService);