import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MEvent, { IEvent } from "../db/models/MEvent.model";
import MBundle from "../db/models/MBundle.model";
import { Types } from "mongoose";

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

        const newEvent = new MEvent({
            bundle: bundleId,
            student: studentId,
            tutor: tutorId,
            subject,
            startTime,
            duration: durationInMinutes
        });

        await newEvent.save();
        return newEvent;
    }
    
    /**
     * Retrieves all events for a given user (tutor or student).
     * @param {string} userId - The ID of the user.
     * @returns {Promise<IEvent[]>} A list of events.
     */
    public async getEvents(userId: string): Promise<IEvent[]> {
        return MEvent.find({ $or: [{ tutor: userId }, { student: userId }] })
            .populate('student', 'displayName')
            .populate('tutor', 'displayName')
            .exec();
    }

    /**
     * Updates an existing event and adjusts the bundle duration.
     * @param {string} eventId - The ID of the event to update.
     * @param {any} eventData - The data to update the event with.
     * @returns {Promise<IEvent | null>} The updated event.
     */
    public async updateEvent(eventId: string, eventData: any): Promise<IEvent | null> {
        const originalEvent = await MEvent.findById(eventId);
        if (!originalEvent) {
            throw new Error("Event not found.");
        }

        const bundle = await MBundle.findById(originalEvent.bundle);
        if (bundle) {
            const subjectInBundle = bundle.subjects.find(s => s.subject === originalEvent.subject);
            if (subjectInBundle) {
                // Refund the original duration
                subjectInBundle.durationMinutes += originalEvent.duration;
                // Deduct the new duration
                if (eventData.duration) {
                    if (eventData.duration > subjectInBundle.durationMinutes) {
                        throw new Error("Event duration exceeds the remaining time for this subject.");
                    }
                    subjectInBundle.durationMinutes -= eventData.duration;
                }
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
}

export default Singleton.getInstance(EventService);