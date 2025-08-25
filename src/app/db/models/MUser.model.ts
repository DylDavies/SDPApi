import { Schema, model, Document, Types } from 'mongoose';
import { EUserType } from '../../models/enums/EUserType.enum';

export interface IUser extends Document {
    _id: Types.ObjectId;
    googleId: string;
    email: string;
    displayName: string;
    picture?: string;
    firstLogin: boolean;
    createdAt: Date;
    type: EUserType;
    roles: Types.ObjectId[];
    pending: boolean;
    disabled: boolean;
}

const UserSchema = new Schema<IUser>({
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    picture: { type: String },
    firstLogin: { type: Boolean, default: true },
    type: { type: String, values: Object.values(EUserType), required: true, default: EUserType.Client },
    roles: [{
        type: Schema.Types.ObjectId,
        ref: 'Role'
    }],
    pending: {
        type: Boolean,
        required: true,
        default: true
    },
    disabled: {
        type: Boolean,
        required: true,
        default: false
    }
}, { timestamps: true });

const MUser = model<IUser>('User', UserSchema);

export default MUser;