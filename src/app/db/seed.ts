import mongoose from 'mongoose';
import { EPermission } from '../models/enums/EPermission.enum';
import MRole from './models/MRole.model';
import MSidebar from './models/MSidebar.model'; // 1. Import the sidebar model
import 'dotenv/config';

/**
 * Defines the default roles and their relationships.
 */
const defaultRoles = [
    {
        name: 'Admin',
        parent: null,
        permissions: Object.values(EPermission),
        color: "#f44336"
    },
    {
        name: 'Tutor',
        parent: 'Admin',
        permissions: [
            EPermission.DASHBOARD_VIEW,
            EPermission.PROFILE_PAGE_VIEW,
            EPermission.USERS_VIEW
        ],
        color: "#673ab7"
    },
    {
        name: 'User',
        parent: 'Tutor',
        permissions: [
            EPermission.DASHBOARD_VIEW,
            EPermission.PROFILE_PAGE_VIEW
        ],
        color: "#009688"
    }
];

/**
 * 2. Defines the default sidebar links with their order.
 */
const defaultSidebarItems = [
    { order: 1, label: 'Home', icon: 'dashboard', route: '/dashboard', requiredPermissions: [] },
    { order: 2, label: 'Profile', icon: 'person', route: '/dashboard/profile', requiredPermissions: [] },
    { order: 3, label: 'User Management', icon: 'people', route: '/dashboard/users', requiredPermissions: [EPermission.USERS_VIEW] },
    { 
      order: 4,
      label: 'Bundles', 
      icon: 'inventory', 
      route: '/dashboard/bundles', 
      requiredPermissions: [
        EPermission.BUNDLES_VIEW,
        EPermission.BUNDLES_CREATE,
        EPermission.BUNDLES_EDIT,
        EPermission.BUNDLES_DELETE
      ] 
    },
    { order: 5, label: 'Admin', icon: 'shield', route: '/dashboard/admin', requiredPermissions: [EPermission.ADMIN_DASHBOARD_VIEW] }
];


/**
 * Connects to the database, seeds the data, and then disconnects.
 */
const seedDatabase = async () => {
    console.log('Connecting to database...');
    if (!process.env.DB_CONN_STRING) {
        throw new Error("DB_CONN_STRING is not set in environment variables.");
    }

    await mongoose.connect(process.env.DB_CONN_STRING, {
        dbName: process.env.DB_NAME
    });
    console.log('Successfully connected to database.');

    // --- Role Seeding ---
    console.log('Seeding roles...');
    const rolePromises = defaultRoles.map(roleData => {
        return MRole.findOneAndUpdate(
            { name: roleData.name },
            { $set: { name: roleData.name, permissions: roleData.permissions, color: roleData.color } },
            { upsert: true, new: true }
        );
    });
    await Promise.all(rolePromises);
    console.log('All roles created or updated.');

    console.log('Establishing role hierarchy...');
    for (const roleData of defaultRoles) {
        if (roleData.parent) {
            const parentRole = await MRole.findOne({ name: roleData.parent });
            const childRole = await MRole.findOne({ name: roleData.name });
            if (parentRole && childRole) {
                childRole.parent = parentRole._id as mongoose.Types.ObjectId | null;
                await childRole.save();
                console.log(`- Set "${parentRole.name}" as parent of "${childRole.name}".`);
            }
        }
    }
    console.log('Role hierarchy established.');
    
    // --- 3. Sidebar Item Seeding ---
    console.log('Seeding sidebar items...');
    // Clear existing items to ensure a clean slate
    await MSidebar.deleteMany({});

    for (const item of defaultSidebarItems) {
        const newSidebarItem = new MSidebar(item);
        await newSidebarItem.save();
        console.log(`- Created sidebar item: "${item.label}"`);
    }
    console.log('Sidebar items seeded successfully.');


    // --- Disconnect ---
    await mongoose.disconnect();
    console.log('Disconnected from database.');
};

seedDatabase().catch(error => {
    console.error('An error occurred during database seeding:', error);
    mongoose.disconnect();
    process.exit(1);
});