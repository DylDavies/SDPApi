import { Schema, model, Document, Types } from 'mongoose';

export interface IDocument extends Document {
    _id: Types.ObjectId;
    fileKey: string; // The unique key/filename
    originalFilename: string;
    contentType: string;
    uploadedBy: Types.ObjectId;
    createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
    fileKey: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    originalFilename: {
        type: String,
        required: true,
        trim: true
    },
    contentType: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const MDocument = model<IDocument>('Document', DocumentSchema);

export default MDocument;