import { Schema, model, Document, Types } from 'mongoose';

interface IRemarkEntry {
    field: string;
    value: string | number | boolean | Date | Types.ObjectId | null;
}

export interface IRemark extends Document {
    event: Types.ObjectId;
    template: Types.ObjectId;
    remarkedAt: Date;
    entries: IRemarkEntry[];
}

const RemarkEntrySchema = new Schema<IRemarkEntry>({
    field: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true }
}, { _id: false });

const RemarkSchema = new Schema<IRemark>({
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    template: { type: Schema.Types.ObjectId, ref: 'RemarkTemplate', required: true },
    remarkedAt: { type: Date, default: Date.now },
    entries: [RemarkEntrySchema]
}, { timestamps: true });

const MRemark = model<IRemark>('Remark', RemarkSchema);

export default MRemark;

