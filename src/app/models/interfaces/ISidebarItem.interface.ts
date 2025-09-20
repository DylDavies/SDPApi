import { Document } from 'mongoose';
import { EPermission } from '../enums/EPermission.enum';

export interface ISidebarItem extends Document {
    label: string;
    icon: string;
    route?: string;
    requiredPermissions?: EPermission[];
    order: number;
    children?: ISidebarItem[];
}