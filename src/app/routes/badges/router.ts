import { Router } from "express";
import { Singleton } from "../../models/classes/Singleton";
import { LoggingService } from "../../services/LoggingService";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import BadgeService from "../../services/BadgeService";
import IBadge from "../../models/interfaces/IBadge.interface";
import { EPermission } from "../../models/enums/EPermission.enum";
import { hasPermission } from "../../middleware/permission.middleware";

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
router.post('/',hasPermission(EPermission.BADGES_CREATE), async(req, res) =>{
    try{
        const badgeData: IBadge & { requirements?: string }= req.body; 
        
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


/**
 * @route   GET /api/badges/:badgeId/requirements
 * @desc    Retrieves the requirements for a single badge.
 * @access  Private (Requires 'badges:view_requirements' permission)
 * @param   {string} badgeId - The ID of the badge.
 * @returns {200: object} The requirements document for the badge.
 * @returns {500: object} An error object if the database operation fails.
 */
router.get('/:badgeId/requirements', hasPermission(EPermission.BADGES_VIEW_REQUIREMENTS), async (req, res) => {
    try {
        const { badgeId } = req.params;
        const requirements = await badgeService.getBadgeRequirement(badgeId);
        return res.status(200).json(requirements);
    } catch (error) {
        logger.error("Error in GET /badges/:badgeId/requirements: ", error);
        res.status(500).json({ error: "Failed to get badge requirements" });
    }
});

/**
 * @route   PATCH /api/badges/:badgeId/requirements
 * @desc    Updates the requirements for a single badge.
 * @access  Private (Requires 'badges:manage_requirements' permission)
 * @param   {string} badgeId - The ID of the badge.
 * @body    {object} { requirements: string } - The new requirements text.
 * @returns {200: object} The updated requirements document.
 * @returns {400: object} An error object if the request body is invalid.
 * @returns {500: object} An error object if the database operation fails.
 */
router.patch('/:badgeId/requirements', hasPermission(EPermission.BADGES_MANAGE_REQUIREMENTS), async (req, res) => {
    try {
        const { badgeId } = req.params;
        const { requirements } = req.body;

        if (typeof requirements !== 'string') {
            return res.status(400).json({ message: 'Requirements text is missing or invalid.' });
        }

        const updated = await badgeService.updateBadgeRequirement(badgeId, requirements);
        return res.status(200).json(updated);
    } catch (error) {
        logger.error("Error in PATCH /badges/:badgeId/requirements: ", error);
        res.status(500).json({ error: "Failed to update badge requirements" });
    }
});

export default router;