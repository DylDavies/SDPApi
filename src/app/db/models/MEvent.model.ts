import { Schema, model, Document, Types } from 'mongoose';

/**
 * Interface for a single event document.
 * @interface IEvent
 * @extends {Document}
 * @property {Types.ObjectId} bundle - The ID of the bundle this event is associated with.
 * @property {Types.ObjectId} student - The ID of the student this event is for.
 * @property {Types.ObjectId} tutor - The ID of the tutor for this event.
 * @property {string} subject - The subject of the event.
 * @property {Date} startTime - The start time of the event.
 * @property {number} duration - The duration of the event in minutes.
 * @property {number} rating - the students rating out of 5
 */
export interface IEvent extends Document {
    bundle: Types.ObjectId;
    student: Types.ObjectId;
    tutor: Types.ObjectId;
    subject: string;
    startTime: Date;
    duration: number; // Duration in minutes
    remarked: boolean;
    remark: Types.ObjectId;
    rating?: number;
}



/**
 * Mongoose schema for the Event model.
 * @const EventSchema
 */
const EventSchema = new Schema<IEvent>({
    bundle: { type: Schema.Types.ObjectId, ref: 'Bundle', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tutor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    startTime: { type: Date, required: true },
    duration: { type: Number, required: true },
    remarked: { type: Boolean, default: false },
    remark: { type: Schema.Types.ObjectId, ref: 'Remark' },
    rating: { type: Number }
}, { timestamps: true });

const MEvent = model<IEvent>('Event', EventSchema);

export default MEvent;