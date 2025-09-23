import { Document, ObjectId, Schema, model } from 'mongoose';

export interface INotification extends Document {
    recipientId: ObjectId;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
    deletedAt?: Date;
}

const NotificationSchema = new Schema<INotification>({
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
});

const MNotification = model<INotification>('Notification', NotificationSchema);

export default MNotification;
