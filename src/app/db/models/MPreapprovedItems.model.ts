import { Schema, model, Document } from 'mongoose';
import { IPreapprovedItem } from '../../models/interfaces/IPreapprovedItem.interface';
import { EItemType } from '../../models/enums/EItemType.enum';

const PreapprovedItemSchema = new Schema({
    itemName: { type: String, unique: true, required: true },
    itemType: { type: String, enum: Object.values(EItemType), required: true },
    defaultAmount: { type: Number, required: true },
    isAdminOnly: { type: Boolean, default: false },
});

export const MPreapprovedItems = model<IPreapprovedItem & Document>('preapproved_items', PreapprovedItemSchema);