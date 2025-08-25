import { Schema, model, Document, Types } from 'mongoose';
import { EPermission } from '../../models/enums/EPermission.enum';

export interface IRole extends Document {
    name: string;
    permissions: EPermission[];
    parent: Types.ObjectId | null; // A reference to the parent role, or null for the root role
    color: string;
}

const RoleSchema = new Schema<IRole>({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    permissions: [{
        type: String,
        enum: Object.values(EPermission),
        required: true
    }],
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Role', // Self-referencing relationship
        default: null
    },
    color: {
        type: String,
        required: true
    }
}, { timestamps: true });

const MRole = model<IRole>('Role', RoleSchema);

export default MRole;
