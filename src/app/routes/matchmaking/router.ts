import { Router } from "express";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import MatchmakingService from "../../services/MatchmakingService";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import { IAddress } from "../../models/interfaces/IAddress.interface";

const router = Router();
const matchmakingService = MatchmakingService;

router.use(authenticationMiddleware);

/**
 * @route   POST /api/matchmaking/find-tutors
 * @desc    Find and rank tutors based on availability, distance, and optionally subject proficiency
 * @access  Requires TUTOR_MATCHMAKING_ACCESS permission
 * @body    {
 *   lessonLocation: IAddress,
 *   subject?: string,
 *   proficiency?: string,
 *   grade?: string,
 *   hoursPerWeek: number,
 *   maxDistance?: number
 * }
 */
router.post("/find-tutors", hasPermission(EPermission.TUTOR_MATCHMAKING_ACCESS), async (req, res) => {
    try {
        const { lessonLocation, subject, proficiency, grade, hoursPerWeek, maxDistance } = req.body;

        // Validation
        if (!lessonLocation || !hoursPerWeek) {
            return res.status(400).json({
                message: "lessonLocation and hoursPerWeek are required."
            });
        }

        if (typeof hoursPerWeek !== 'number' || hoursPerWeek <= 0) {
            return res.status(400).json({
                message: "hoursPerWeek must be a positive number."
            });
        }

        // Validate lesson location has sufficient data
        const location = lessonLocation as IAddress;
        if (!location.formattedAddress && !location.city) {
            return res.status(400).json({
                message: "lessonLocation must include formattedAddress or at least city information."
            });
        }

        // Find matching tutors
        const matchedTutors = await matchmakingService.findMatchingTutors({
            lessonLocation: location,
            subject,
            proficiency,
            grade,
            hoursPerWeek,
            maxDistance
        });

        res.status(200).json({
            criteria: { lessonLocation, subject, proficiency, grade, hoursPerWeek, maxDistance },
            matchCount: matchedTutors.length,
            tutors: matchedTutors
        });
    } catch (error) {
        res.status(500).json({
            message: "Error finding matching tutors",
            error: (error as Error).message
        });
    }
});

export default router;
