import { Router } from "express";
import { Singleton } from "../../models/classes/Singleton";
import { LoggingService } from "../../services/LoggingService";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import BadgeService from "../../services/BadgeService";
import IBadge from "../../models/interfaces/IBadge.interface";
import { error } from "console";

const router = Router();
const logger = Singleton.getInstance(LoggingService);
const badgeService = BadgeService;

router.use(authenticationMiddleware);


/**
 * @route POST /badges
 * @description Adds a new badge or updates an existing one based on provided badge data.
 * @returns 200 - Successfully added/updated badge
 * @returns 400 - Missing or invalid badge data
 * @returns 500 - Internal server error
 */
router.post('/', async(req, res) =>{
    try{
        const badgeData: IBadge = req.body; 
        
        if(!badgeData){
            return res.status(400).json({ error: "Missing badge data" });
        }

        const result = await badgeService.addOrUpdatebadge(badgeData);
        res.status(200).json(result);
    }
    catch(error){
        logger.error("Error in POST Badges ",error);
        res.status(500).json({ error: "Failed to add or update one badge" })
    }
})

/**
 * @route GET /badges
 * @description Retrieves all badges from the system.
 * @returns 200 - Array of badge documents
 * @returns 500 - Internal server error
 */
router.get('/', async(req, res) =>{
    try{
        const badges = await badgeService.getBadges();
        return res.status(200).json(badges);
    }
    catch(error){
        logger.error("Error in GET /badges: ", error);
        res.status(500).json({ error: "Failed to get all badges" });
    }
});

/**
 * @route DELETE /badges/:badgeId
 * @description Deletes a badge by its ID.
 * @param badgeId - ID of the badge to delete
 * @returns 200 - Success message upon deletion
 * @returns 400 - Error deleting badge
 */
router.delete('/:badgeId', async(req, res) =>{
    try{
        const { badgeId } = req.params;
        await badgeService.deleteBadge(badgeId);
        res.status(200).json({ message: "Badge deleted successfully" });
    } 
    catch(error){
        res.status(400).json({ message: "Error deleting Badge", error: (error as Error).message });
    }    
})

export default router;