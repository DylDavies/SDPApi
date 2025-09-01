
import { Schema, model, Document, Types } from 'mongoose';
import { EUserType } from '../../models/enums/EUserType.enum';
import { ILeave } from '../../models/interfaces/ILeave.interface';
import { ELeave } from '../../models/enums/ELeave.enum';
import MProficiencies, { IProficiencyDocument } from './MProficiencies.model';
import { Theme } from '../../models/types/theme.type';
import { EPermission } from '../../models/enums/EPermission.enum';


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
    leave: ILeave [];
    pending: boolean;
    disabled: boolean;
    proficiencies: IProficiencyDocument[];
    theme: Theme;
    availability?: number;
}

export interface IUserWithPermissions extends IUser {
    permissions: EPermission[];
}

const LeaveSchema = new Schema<ILeave>({
    reason: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    approved: { type: String, enum: Object.values(ELeave), default: ELeave.Pending }
}, { timestamps: true });

const ProficiencySchemaUser = MProficiencies.schema;

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
    leave: [LeaveSchema],
    pending: {
        type: Boolean,
        required: true,
        default: true
    },
    disabled: {
        type: Boolean,
        required: true,
        default: false
    },
    proficiencies: [ProficiencySchemaUser],
    theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
    },
    availability:{
        type: Number,
        default: 0
    }
}, { timestamps: true });

const MUser = model<IUser>('User', UserSchema);

export default MUser;
