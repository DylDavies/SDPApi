import { Singleton } from "../models/classes/Singleton";
import MUser, { IUser, IUserWithPermissions } from "../db/models/MUser.model";
import RoleService from "./RoleService";
import { Types } from "mongoose";
import { LoggingService } from "./LoggingService";
import { IService } from "../models/interfaces/IService.interface";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { ELeave } from "../models/enums/ELeave.enum";
import { EUserType } from "../models/enums/EUserType.enum";
import { IProficiencyDocument } from "../db/models/MProficiencies.model";
import { IProficiency } from "../models/interfaces/IProficiency.interface";
import ISubject from "../models/interfaces/ISubject.interface";
import { Theme } from "../models/types/theme.type";
import { IRole } from "../db/models/MRole.model";
import { EPermission } from "../models/enums/EPermission.enum";
import notificationService from "./NotificationService";

const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * A service for managing user data, including their assigned roles.
 */
export class UserService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Medium;
    private roleService = RoleService;
    private logger = Singleton.getInstance(LoggingService);

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Finds a user by their Google ID, updating their profile if they exist,
     * or creating a new user if they don't.
     * @param userData The user data received from Google.
     * @returns The created or updated user document.
     */
    public async addOrUpdateUser(userData: { googleId: string, email: string, displayName: string, picture?: string }): Promise<IUser> {
        const { googleId, email, picture, displayName } = userData;
        const user = await MUser.findOneAndUpdate(
            { googleId: googleId },
            {
                $set: { email, picture, displayName },
                $setOnInsert: { googleId, firstLogin: true }
            },
            { upsert: true, new: true, runValidators: true }
        );
        return user;
    }
    /**
     * @description
     * This is the new method to add a leave request for a specific user.
     * It finds the user by their ID and pushes a new leave object into their 'leave' array.
     * @param userId The ID of the user submitting the request.
     * @param leaveData The details of the leave request.
     * @returns The updated user document with the new leave request, or null if the user isn't found.
     */
    public async addLeaveRequest(userId: string, leaveData: { reason: string, startDate: Date, endDate: Date }): Promise<IUser | null> {
        if (!Types.ObjectId.isValid(userId)) {
            this.logger.warn(`Invalid ID string provided to addLeaveRequest: "${userId}"`);
            return null;
        }

        const { reason, startDate, endDate } = leaveData;

        const newLeaveRequest = {
            reason,
            startDate,
            endDate,
            approved: ELeave.Pending 
        };

        // Find the user and push the new leave request into their 'leave' array.
        return MUser.findByIdAndUpdate(
            userId,
            { $push: { leave: newLeaveRequest } },
            { new: true, runValidators: true } // 'new: true' returns the modified document
        );
    }

    /**
    *@description
    *Updates the status of a specific leave request for a user.
    *@param userId The ID of the user.
    *@param leaveId The ID of the leave request to update.
    *@param approved The new status (Approved or Denied).
    *@returns The updated user document, or null if the user or leave request is not found.
    */
    public async updateLeaveRequestStatus(userId: string, leaveId: string, approved: ELeave.Approved | ELeave.Denied): Promise<IUser | null> {
        if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(leaveId)) {
            this.logger.warn(`Invalid ID string provided to updateLeaveRequestStatus. User ID: "${userId}", Leave ID: "${leaveId}"`);
            return null;
        }

        const user = await MUser.findOne({ _id: userId, "leave._id": leaveId });
        if (!user) {
            this.logger.warn(`User or leave request not found for User ID: "${userId}", Leave ID: "${leaveId}"`);
            return null;
        }

        const leaveRequest = user.leave.find(l => l._id.toString() === leaveId);
        if (!leaveRequest) {
            // This should theoretically not happen if the query above succeeds, but it's good practice
            return null; 
        }

        const status = approved === ELeave.Approved ? 'Approved' : 'Denied';
        const statusColor = approved === ELeave.Approved ? '#4CAF50' : '#F44336'; // Green for approved, Red for denied

        const html = `
        <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="color-scheme" content="light dark">
                <meta name="supported-color-schemes" content="light dark">
                <style>
                    body { font-family: Roboto, "Helvetica Neue", sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                    .header { background-color: #2855b6; padding: 20px; text-align: center; }
                    .header img { width: 80px; }
                    .content { padding: 30px; line-height: 1.6; color: #333; }
                    .content h1 { font-size: 24px; color: #333; margin-top: 0; }
                    .status-box { padding: 12px; text-align: center; border-radius: 4px; margin: 20px 0; font-size: 18px; font-weight: bold; color: #fff; }
                    .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .details-table td { padding: 8px; border-bottom: 1px solid #eaeaea; }
                    .details-table td:first-child { font-weight: bold; width: 120px; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; background-color: #f9f9f9; }
                    .button { display: inline-block; padding: 12px 24px; margin-top: 20px; background-color: #2855b6; color: #ffffff !important; text-decoration: none; border-radius: 5px; font-weight: bold; }

                    @media (prefers-color-scheme: dark) {
                        .container { background-color: #222222; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                        .content { color: #eeeeee; }
                        .content h1 { color: #eeeeee; }
                        .details-table td { border-bottom-color: #444444; }
                        .footer { background-color: #1a1a1a; color: #aaaaaa; }

                        .button {
                            background-color: #5c85d6 !important; /* A lighter, more visible blue */
                            color: #ffffff !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="https://tutorcore.works/assets/logo_circle.png" alt="Company Logo">
                    </div>
                    <div class="content">
                        <h1>Leave Request Update</h1>
                        <p>Hi ${user.displayName},</p>
                        <p>There has been an update to your recent leave request. The status is now:</p>
                        <div class="status-box" style="background-color: ${statusColor};">
                            ${status}
                        </div>
                        <table class="details-table">
                            <tr>
                                <td>Reason:</td>
                                <td>${leaveRequest.reason}</td>
                            </tr>
                            <tr>
                                <td>From:</td>
                                <td>${formatDate(leaveRequest.startDate)}</td>
                            </tr>
                            <tr>
                                <td>To:</td>
                                <td>${formatDate(leaveRequest.endDate)}</td>
                            </tr>
                        </table>
                        <a href="${process.env.FRONTEND_URL}/dashboard/profile" class="button">View My Profile</a>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} TutorCore. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await notificationService.createNotification(
            userId, 
            "Leave Request Updated", 
            `Your leave request for "${leaveRequest.reason}" has been ${status}.`, 
            true, 
            html
        );

        leaveRequest.approved = approved;
        user.markModified('leave');
        return user.save();
    }

    /**
     * Finds a user by their MongoDB document ID.
     * @param id The user's ObjectId as a string.
     * @returns The user document or null if not found or ID is invalid.
     */
    public async getUser(id: string): Promise<IUserWithPermissions | null> {
        if (!Types.ObjectId.isValid(id)) {
            this.logger.warn(`Invalid ID string provided to getUser: "${id}"`);
            return null;
        }

        const user = await MUser.findById(id).populate('roles') as IUser | null;

        if (user) {
            const permissions: EPermission[] = [];

            for (let i = 0; i < user.roles.length; i++) {
                const role = user.roles[i] as unknown as IRole;

                for (const perm of role.permissions) {
                    if (!permissions.includes(perm)) permissions.push(perm);
                }
            }

            return {...(user as unknown as {_doc: IUser})._doc, permissions} as IUserWithPermissions;
        } else return null;
    }
    
    /**
     * Updates a user's profile information.
     * @param id The ID of the user to edit.
     * @param updateData An object containing the fields to update.
     * @returns The updated user document or null if not found.
     */
    public async editUser(id: string, updateData: Partial<Pick<IUser, 'displayName' | 'picture'>>): Promise<IUser | null> {
        if (!Types.ObjectId.isValid(id)) {
            this.logger.warn(`Invalid ID string provided to editUser: "${id}"`);
            return null;
        }
        const updatePayload = { ...updateData, firstLogin: false };
        return MUser.findByIdAndUpdate(id, { $set: updatePayload }, { new: true, runValidators: true });
    }

    /**
     * Assigns a role to a user, enforcing hierarchy rules.
     * @param performingUserId The ID of the user performing the action.
     * @param targetUserId The ID of the user to whom the role will be assigned.
     * @param roleId The ID of the role to assign.
     */
    public async assignRoleToUser(performingUserId: string, targetUserId: string, roleId: string, isAdmin: boolean = false): Promise<IUser> {
        const performingUser = await MUser.findById(performingUserId).populate('roles');
        if (!performingUser) throw new Error("Performing user not found.");

        const performingUserDescendants = await this.roleService.getDescendantRoleIds(performingUser.roles as Types.ObjectId[]);
        
        if (!performingUserDescendants.has(roleId) && !isAdmin) {
            throw new Error("Forbidden: You can only assign roles that are below your own in the hierarchy.");
        }

        await MUser.updateOne({ _id: targetUserId }, { $addToSet: { roles: roleId } });
        
        return (await MUser.findById(targetUserId).populate('roles'))!;
    }

    /**
     * Removes a role from a user, enforcing hierarchy rules.
     * @param performingUserId The ID of the user performing the action.
     * @param targetUserId The ID of the user from whom the role will be removed.
     * @param roleId The ID of the role to remove.
     */
    public async removeRoleFromUser(performingUserId: string, targetUserId: string, roleId: string, isAdmin: boolean = false): Promise<IUser> {
        const performingUser = await MUser.findById(performingUserId).populate('roles');
        if (!performingUser) throw new Error("Performing user not found.");

        const performingUserDescendants = await this.roleService.getDescendantRoleIds(performingUser.roles as Types.ObjectId[]);

        if (!performingUserDescendants.has(roleId) && !isAdmin) {
            throw new Error("Forbidden: You can only manage roles that are below your own in the hierarchy.");
        }

        await MUser.updateOne({ _id: targetUserId }, { $pull: { roles: roleId } });

        return (await MUser.findById(targetUserId).populate('roles'))!;
    }

    /**
     * Approves a user
     * @param targetUserId The ID of the user whom will be approved.
     */
    public async approveUser(targetUserId: string): Promise<IUser> {
        await MUser.updateOne({ _id: targetUserId }, { $set: { pending: false } });

        return (await MUser.findById(targetUserId).populate('roles'))!;
    }

    /**
     * Disables a user
     * @param targetUserId The ID of the user whom will be disabled.
     */
    public async disableUser(targetUserId: string): Promise<IUser> {
        await MUser.updateOne({ _id: targetUserId }, { $set: { disabled: true } });

        return (await MUser.findById(targetUserId).populate('roles'))!;
    }

    /**
     * Enables a user
     * @param targetUserId The ID of the user whom will be enabled.
     */
    public async enableUser(targetUserId: string): Promise<IUser> {
        await MUser.updateOne({ _id: targetUserId }, { $set: { disabled: false } });

        return (await MUser.findById(targetUserId).populate('roles'))!;
    }

    /**
     * Updates a user type
     * @param targetUserId The ID of the user whom will be enabled.
     * @param type The type the user will be updated to.
     */
    public async updateUserType(targetUserId: string, type: EUserType): Promise<IUser> {
        await MUser.updateOne({ _id: targetUserId }, { $set: { type } });

        return (await MUser.findById(targetUserId).populate('roles'))!;
    }

    /**
     * Adds or updates the proficiencies of a given user
     * @param userId userId of the user to be updated
     * @param ProfData new proficiency data that will be added
     * @returns the updated user document or null if user was not found or an error occured
     */
    public async addOrUpdateProficiency(userId: string, profData: IProficiency): Promise<IUser | Partial<IUser> | null>{
        const user = await MUser.findById(userId);
        if (!user) {
            this.logger.warn(`User with Id ${userId} was not found`);
            return null;
        }

        const profIndex = user.proficiencies.findIndex(p => p.name === profData.name);
        const subjectsMap = new Map<string, ISubject>(Object.entries(profData.subjects));

        if (profIndex > -1){
            const userProficiency = user.proficiencies[profIndex];

            userProficiency.subjects.clear();

            subjectsMap.forEach((value, key) => {
                userProficiency.subjects.set(key, value);
            });
        } 
        else{
            const newProficiency = {
                name: profData.name,
                subjects: subjectsMap
            };
            user.proficiencies.push(newProficiency as IProficiencyDocument);
        }

        user.markModified('proficiencies');
        await user.save();

        const updatedUser = await MUser.findById(userId).populate('roles').lean();
        return updatedUser as unknown as IUser;
    }

    /**
     * Deletes a proficiency from a user.
     * @param userId The ID of the user.
     * @param profName The name of the proficiency to remove.
     * @returns The updated user document or null if not found.
     */
     public async deleteProficiency(userId: string, profName: string): Promise<IUser | null>{
        return MUser.findByIdAndUpdate(userId, { $pull: { proficiencies: { name: profName } }}, { new: true }).populate('roles');
    }

    /**
     * Deletes a subject from a user's proficiency by its ID.
     * @param userId The ID of the user.
     * @param profName The name of the proficiency.
     * @param subjectId The ID of the subject to remove.
     * @returns The updated user document or null if not found.
     */
    public async deleteSubject(userId: string, profName: string, subjectId: string): Promise<IUser | null> {
        const user = await MUser.findById(userId);
        if (!user) {
            this.logger.warn(`User with Id ${userId} was not found`);
            return null;
        }

        const proficiencyToUpdate = user.proficiencies.find(p => p.name === profName);

        if (proficiencyToUpdate) {
            const subjectsAsArray = Array.from(proficiencyToUpdate.subjects.entries());

            const filteredSubjects = subjectsAsArray.filter(([_key, subject]) => {
                return subject._id?.toString() !== subjectId;
            });

            proficiencyToUpdate.subjects = new Map(filteredSubjects);

            user.markModified('proficiencies');
            await user.save();
        }
        
        const updatedUser = await MUser.findById(userId).populate('roles').lean();
        return updatedUser as unknown as IUser;
    }

    public async getAllUsers() {
        return await MUser.find().populate(['roles', 'proficiencies']);
    }

    public async updateUserPreferences(userId: string, preferences: { theme: Theme }) {
        await MUser.findByIdAndUpdate(userId, { $set: { theme: preferences.theme } });
    }


    /**
     * Updates a user's weekly availability.
     * @param id The ID of the user to edit.
     * @param availability The new number of hours for availability.
     * @returns The updated user document or null if not found.
     */
    public async updateAvailability(id: string, availability: number): Promise<IUser | null> {
        if (!Types.ObjectId.isValid(id)) {
            this.logger.warn(`Invalid ID string provided to updateAvailability: "${id}"`);
            return null;
        }
        return MUser.findByIdAndUpdate(id, { $set: { availability } }, { new: true, runValidators: true }).populate('roles');
    }

}

export default Singleton.getInstance(UserService);