import { Types } from 'mongoose';

export interface IEventPayload {
    userId: Types.ObjectId;
    eventDate: Date;
    description: string; // A descriptive title for the event, e.g., "Tutoring - Jane Doe"
    quantity: number;    // e.g., hours, units, etc.
    rate: number;        // The rate per unit/hour for this specific event
}