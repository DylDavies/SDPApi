import { Schema, model, Document, Types } from 'mongoose';
import { EBundleStatus } from '../../models/enums/EBundleStatus.enum';

// Interface for the subjects within a bundle
interface IBundleSubject {
    _id?: Types.ObjectId;
    subject: string;
    grade: string;
    tutor: Types.ObjectId;
    durationMinutes: number; // Changed from 'hours' to 'durationMinutes'
}

// Interface for the main bundle document
export interface IBundle extends Document {
    _id: Types.ObjectId;
    student: Types.ObjectId;
    subjects: IBundleSubject[];
    isActive: boolean;
    status: EBundleStatus;
    createdBy: Types.ObjectId;
    createdAt: Date;
}

// Schema for the embedded subject documents
const BundleSubjectSchema = new Schema<IBundleSubject>({
    subject: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    tutor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    durationMinutes: { type: Number, required: true, min: 0 } 
});

// Schema for the main bundle collection
const BundleSchema = new Schema<IBundle>({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subjects: [BundleSubjectSchema],
    isActive: { type: Boolean, default: true },
    status: {
        type: String,
        enum: Object.values(EBundleStatus),
        default: EBundleStatus.Pending
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const MBundle = model<IBundle>('Bundle', BundleSchema);

export default MBundle;