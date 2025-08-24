
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
    }]
}, { timestamps: true });

const MUser = model<IUser>('User', UserSchema);

export default MUser;
