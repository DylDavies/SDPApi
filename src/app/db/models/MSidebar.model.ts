import { Schema, model } from 'mongoose';
import { ISidebarItem } from '../../models/interfaces/ISidebarItem.interface';
import { EPermission } from '../../models/enums/EPermission.enum';

const SidebarItemSchema = new Schema<ISidebarItem>();

SidebarItemSchema.add({
    label: { 
        type: String, 
        required: true 
    },
    icon: { 
        type: String, 
        required: true 
    },
    route: { 
        type: String, 
        required: false
    },
    requiredPermissions: {
        type: [{ 
            type: String, 
            enum: Object.values(EPermission)
        }],
        default: []
    },
    order: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    children: {
        type: [SidebarItemSchema],
        default: undefined
    }
});

const MSidebar = model<ISidebarItem>('SidebarItem', SidebarItemSchema);

export default MSidebar;