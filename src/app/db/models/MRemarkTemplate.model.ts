import { Schema, model, Document } from 'mongoose';

export type RemarkFieldType = 'string' | 'boolean' | 'number' | 'time';

export interface IRemarkField {
    name: string;
    type: RemarkFieldType;
}

export interface IRemarkTemplate extends Document {
    name: string;
    fields: IRemarkField[];
    isActive: boolean;
}

const RemarkFieldSchema = new Schema<IRemarkField>({
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['string', 'boolean', 'number', 'time'],
        required: true
    }
}, { _id: false });

const RemarkTemplateSchema = new Schema<IRemarkTemplate>({
    name: { type: String, required: true},
    fields: [RemarkFieldSchema],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const MRemarkTemplate = model<IRemarkTemplate>('RemarkTemplate', RemarkTemplateSchema);

export default MRemarkTemplate;

