import mongoose from 'mongoose';
import { EPermission } from '..//models/enums/EPermission.enum';
import MRole from './models/MRole.model';
import 'dotenv/config'; // Make sure to install dotenv: npm install dotenv

/**
 * Defines the default roles and their relationships.
 * The `parent` property uses the role's name for easy reference.
 * The root role ('Admin') has no parent.
 */
const defaultRoles = [
    {
        name: 'Admin',
        parent: null, // This is the root role
        permissions: Object.values(EPermission), // Admins get all permissions
    },
    {
        name: 'Tutor',
        parent: 'Admin', // Tutor is a child of Admin
        permissions: [
            EPermission.DASHBOARD_VIEW,
            EPermission.PROFILE_PAGE_VIEW,
            EPermission.USERS_VIEW // Tutors can view users
        ]
    },
    {
        name: 'User',
        parent: 'Tutor', // User is a child of Tutor
        permissions: [
            EPermission.DASHBOARD_VIEW,
            EPermission.PROFILE_PAGE_VIEW
        ]
    }
];

/**
 * Connects to the database, seeds the roles, establishes the tree structure, and then disconnects.
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

    console.log('Seeding roles...');
    const rolePromises = defaultRoles.map(roleData => {
        // Use findOneAndUpdate with upsert to create or update roles without the parent link first.
        return MRole.findOneAndUpdate(
            { name: roleData.name },
            { $set: { name: roleData.name, permissions: roleData.permissions } },
            { upsert: true, new: true }
        );
    });

    await Promise.all(rolePromises);
    console.log('All roles created or updated.');

    console.log('Establishing role hierarchy...');
    for (const roleData of defaultRoles) {
        if (roleData.parent) {
            // Find the parent and child documents in the database
            const parentRole = await MRole.findOne({ name: roleData.parent });
            const childRole = await MRole.findOne({ name: roleData.name });

            if (parentRole && childRole) {
                // Set the parent reference on the child role
                childRole.parent = parentRole._id as mongoose.Types.ObjectId | null;
                await childRole.save();
                console.log(`- Set "${parentRole.name}" as parent of "${childRole.name}".`);
            }
        }
    }
    
    console.log('Role hierarchy established.');
    await mongoose.disconnect();
    console.log('Disconnected from database.');
};

seedDatabase().catch(error => {
    console.error('An error occurred during database seeding:', error);
    mongoose.disconnect();
    process.exit(1);
});
