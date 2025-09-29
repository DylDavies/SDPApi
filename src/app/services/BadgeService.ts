import mongoose from "mongoose";
import MBadge, { IBadgeDocument } from "../db/models/MBadge.model";
import { Singleton } from "../models/classes/Singleton";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { LoggingService } from "./LoggingService";
import MBadgeRequirement from "../db/models/MBadgeRequirement.model";
import { IBadgeWithRequirements } from "../models/interfaces/IBadgeWithRequirements.interface";

/**
 * Service responsible for managing badge operations such as creation, update,
 * retrieval, and deletion.
*/
export class BadgeService implements IService{
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;
    private logger = Singleton.getInstance(LoggingService);

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Adds a new badge or updates an existing one, and handles its associated requirements.
     * If an `_id` is provided in the badge data, the function performs an update; otherwise, it creates a new badge.
     * @param {IBadgeWithRequirements} badgeData - The complete badge data, including the optional `requirements` text.
     * @returns {Promise<IBadgeDocument | null>} A promise that resolves to the newly created or updated badge document, or `null` if an error occurs.
     */
    public async addOrUpdatebadge(badgeData: IBadgeWithRequirements): Promise<IBadgeDocument | null>{
        const { requirements, ...coreBadgeData } = badgeData;
        let savedBadge: IBadgeDocument | null = null;

        try{
            if (coreBadgeData._id && mongoose.Types.ObjectId.isValid(coreBadgeData._id)){
                savedBadge = await MBadge.findByIdAndUpdate(
                    coreBadgeData._id,
                    { $set: coreBadgeData },
                    { new: true, runValidators: true }
                );
            }
            else{
                const { _id, ...badgeToCreate } = coreBadgeData;
                const newBadge = new MBadge(badgeToCreate);
                savedBadge = await newBadge.save();
            }

            if (savedBadge && typeof requirements === 'string'){
                await MBadgeRequirement.findOneAndUpdate(
                    { badgeId: savedBadge._id },
                    { badgeId: savedBadge._id, requirements: requirements },
                    { upsert: true, new: true, runValidators: true }
                );
                this.logger.info(`Successfully created/updated requirements for badge: ${savedBadge.name}`);
            }

            return savedBadge;

        } 
        catch(error){
            this.logger.error("Error in addOrUpdatebadge:", error);
            return null;
        }
    }

    /**
     * Retrieves all badge documents from the database.
     * @returns {Promise<IBadgeDocument[]>} A promise that resolves to an array of all badge documents.
     */
    public async getBadges(): Promise<IBadgeDocument[]>{
        return MBadge.find();
    }

    /**
     * Retrieves a single badge by its id
     * @param badgeId - the ID of the badge to be found
     */
    public async getBadgeById(badgeId: string): Promise<IBadgeDocument | null>{
        return MBadge.findById(badgeId);    
    }

    /**
     * Retrieves multiple badges by an array of badge ID's
     * @param ids - Array of badge id strings
     */
    public async getBadgesByIds(ids: string[]): Promise<IBadgeDocument[] | null>{
        return MBadge.find({ '_id': {$in: ids } });
    }


    /**
     * Deletes a badge and its associated requirements document by the badge's ID.
     * @param {string} badgeId - The ID of the badge to delete.
     * @returns {Promise<{ deletedCount: number }>} A promise that resolves to an object indicating the number of deleted badges.
     */    
    public async deleteBadge(badgeId: string): Promise<{ deletedCount: number }>{
        await MBadgeRequirement.deleteOne({ badgeId: badgeId }); // delete the badge requirement for the relevant badge

        const result = await MBadge.deleteOne({ _id: badgeId });
        return result;
    }

    /**
     * Retrieves the requirements for a single badge by its ID.
     * @param {string} badgeId - The ID of the badge.
     * @returns {Promise<object>} A promise that resolves to the requirements document or a default object if none is found.
     */
    public async getBadgeRequirement(badgeId: string) {
        const requirementDoc = await MBadgeRequirement.findOne({ badgeId });
        if (!requirementDoc) {
            return { requirements: 'No requirements specified for this badge yet.' };
        }
        return requirementDoc;
    }

    /**
     * Creates or updates the requirements for a specific badge.
     * @param {string} badgeId - The ID of the badge to link the requirement to.
     * @param {string} requirements - The requirements text to save.
     * @returns {Promise<any>} A promise that resolves to the created or updated requirements document.
     */
    public async updateBadgeRequirement(badgeId: string, requirements: string) {
        return MBadgeRequirement.findOneAndUpdate(
            { badgeId },
            { requirements },
            { upsert: true, new: true }
        );
    } 

}

export default Singleton.getInstance(BadgeService);