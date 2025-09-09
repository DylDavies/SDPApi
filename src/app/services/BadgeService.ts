import mongoose from "mongoose";
import MBadge, { IBadgeDocument } from "../db/models/MBadge.model";
import { Singleton } from "../models/classes/Singleton";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import IBadge from "../models/interfaces/IBadge.interface";
import { IService } from "../models/interfaces/IService.interface";
import { LoggingService } from "./LoggingService";


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
     * Adds a new badge or updates an existing badge if a valid `_id` is provided.
     *
     * @param badgeData - The badge data to insert or update.
     * @returns A promise resolving to the updated or newly created badge document, or `null` if update failed.
    */
    public async addOrUpdatebadge(badgeData: IBadge): Promise<IBadgeDocument | null>{
        if(badgeData._id && mongoose.Types.ObjectId.isValid(badgeData._id)){
            const badgeId = new mongoose.Types.ObjectId(badgeData._id);
            const badge = await MBadge.findOneAndUpdate(
                { _id: badgeId},
                { $set: { 
                    image: badgeData.image, 
                    name: badgeData.name, 
                    TLA: badgeData.TLA, 
                    summary: badgeData.summary, 
                    description: badgeData.description,
                    permanent: badgeData.permanent,
                    expirationDate: badgeData.expirationDate,
                    bonus: badgeData.bonus
                    }
                },
                { new: true, runValidators: true } 
            );

            return badge;
        }
        else{
            const badge = new MBadge(badgeData);
            return await badge.save();
        }

    }

    /**
     * Retrieves all badges stored in the database.
     *
     * @returns A promise resolving to an array of badge documents.
    */
    public async getBadges(): Promise<IBadgeDocument[]>{
        return MBadge.find();
    }

    /**
     * Deletes a badge by its ID.
     *
     * @param badgeId - The ID of the badge to delete.
     * @returns A promise resolving to an object containing the number of documents deleted.
    */    
    public async deleteBadge(badgeId: string): Promise<{ deletedCount: number }>{
        const result = await MBadge.deleteOne({ _id: badgeId });
        return result;
    }

}

export default Singleton.getInstance(BadgeService);