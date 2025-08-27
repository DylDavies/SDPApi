import { Singleton } from "../models/classes/Singleton";
import MUser, { IUser } from "../db/models/MUser.model";
import RoleService from "./RoleService";
import { Types } from "mongoose";
import { LoggingService } from "./LoggingService";
import { IService } from "../models/interfaces/IService.interface";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { ELeave } from "../models/enums/ELeave.enum";
import { EUserType } from "../models/enums/EUserType.enum";
import { IProficiency } from "../db/models/MProficiencies.model";

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
    *@param status The new status (Approved or Denied).
    *@returns The updated user document, or null if the user or leave request is not found.
    */
    public async updateLeaveRequestStatus(userId: string, leaveId: string, status: ELeave.Approved | ELeave.Denied): Promise<IUser | null> {
        if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(leaveId)) {
        this.logger.warn(`Invalid ID string provided to updateLeaveRequestStatus. User ID: "${userId}", Leave ID: "${leaveId}"`);
        return null;
    }

    return MUser.findOneAndUpdate(
        { _id: userId, "leave._id": leaveId },
        { $set: { "leave.$.approved": status } },
        { new: true }
    );
    }

    /**
     * Finds a user by their MongoDB document ID.
     * @param id The user's ObjectId as a string.
     * @returns The user document or null if not found or ID is invalid.
     */
    public async getUser(id: string): Promise<IUser | null> {
        if (!Types.ObjectId.isValid(id)) {
            this.logger.warn(`Invalid ID string provided to getUser: "${id}"`);
            return null;
        }
        return MUser.findById(id).populate('roles');
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
    public async addOrUpdateProficiency(userId: string, ProfData: IProficiency): Promise<IUser | null>{
        if(!Types.ObjectId.isValid(userId)){
            this.logger.warn(`Invalid ID provided to addOrUpdateProficiency: "${userId}"`);
            return null;
        }

        try{
            const user = await MUser.findById(userId);
            if(!user){
                this.logger.warn(`User with Id ${userId} was not found`);
                return null;
            }

            const prof = user.proficiencies.find(p => p.name === ProfData.name); // get the prof with the name begin passed in 

            if(prof){
                prof.set(ProfData); // if prof exists then update it
            }
            else{
                user.proficiencies.push(ProfData); // add a new prof to the array
            }

            const updatedUserData = await user.save();
            this.logger.info(`User with Id ${userId} was updated successfully`);
            
            return updatedUserData;
        }
        catch(error){
            this.logger.warn("Error when adding or updating the users proficiency: ", error);
            return null;
        }
    }
}

export default Singleton.getInstance(UserService);