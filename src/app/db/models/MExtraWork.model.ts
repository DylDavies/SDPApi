import { Schema, model, Document, Types } from 'mongoose';

// Enum for the status of the extra work
export enum EExtraWorkStatus {
    InProgress = 'In Progress',
    Completed = 'Completed',
    Approved = 'Approved',
    Denied = 'Denied' // Added the new Denied status
}

// Interface for the extra work document
export interface IExtraWork extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    studentId: Types.ObjectId;
    commissionerId: Types.ObjectId;
    workType: string;
    details: string;
    remuneration: number;
    dateCompleted: Date | null;
    status: EExtraWorkStatus;
    createdAt: Date;
}

// Schema for the extra work collection
const ExtraWorkSchema = new Schema<IExtraWork>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    commissionerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    workType: { type: String, required: true, trim: true },
    details: { type: String, required: true, trim: true, maxlength: 500 },
    remuneration: { type: Number, required: true, min: 0, max: 10000 },
    dateCompleted: { type: Date, default: null },
    status: {
        type: String,
        enum: Object.values(EExtraWorkStatus),
        default: EExtraWorkStatus.InProgress
    },
}, { timestamps: true });

const MExtraWork = model<IExtraWork>('ExtraWork', ExtraWorkSchema);

export default MExtraWork;