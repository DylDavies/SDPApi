import { Singleton } from "../models/classes/Singleton";
import MUser, { IUser } from "../db/models/MUser.model";
import RoleService from "./RoleService";
import { Types } from "mongoose";
import { LoggingService } from "./LoggingService";
import { IService } from "../models/interfaces/IService.interface";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { ELeave } from "../models/enums/ELeave.enum";

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
    public async assignRoleToUser(performingUserId: string, targetUserId: string, roleId: string): Promise<IUser> {
        const performingUser = await MUser.findById(performingUserId).populate('roles');
        if (!performingUser) throw new Error("Performing user not found.");

        const performingUserDescendants = await this.roleService.getDescendantRoleIds(performingUser.roles as Types.ObjectId[]);
        
        if (!performingUserDescendants.has(roleId)) {
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
    public async removeRoleFromUser(performingUserId: string, targetUserId: string, roleId: string): Promise<IUser> {
        const performingUser = await MUser.findById(performingUserId).populate('roles');
        if (!performingUser) throw new Error("Performing user not found.");

        const performingUserDescendants = await this.roleService.getDescendantRoleIds(performingUser.roles as Types.ObjectId[]);

        if (!performingUserDescendants.has(roleId)) {
            throw new Error("Forbidden: You can only manage roles that are below your own in the hierarchy.");
        }

        await MUser.updateOne({ _id: targetUserId }, { $pull: { roles: roleId } });

        return (await MUser.findById(targetUserId).populate('roles'))!;
    }
}

export default Singleton.getInstance(UserService);