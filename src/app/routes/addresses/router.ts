import { Router } from 'express';
import { authenticationMiddleware } from '../../middleware/auth.middleware';
import GoogleMapsService from '../../services/GoogleMapsService';
import { Singleton } from '../../models/classes/Singleton';
import { LoggingService } from '../../services/LoggingService';

const router = Router();
const googleMapsService = GoogleMapsService;
const logger = Singleton.getInstance(LoggingService);

// All address routes require authentication
router.use(authenticationMiddleware);

/**
 * @route GET /api/addresses/autocomplete
 * @desc Get address autocomplete suggestions
 * @access Private
 * @query { input: string }
 */
router.get('/autocomplete', async (req, res) => {
    try {
        const { input } = req.query;

        if (!input || typeof input !== 'string') {
            return res.status(400).json({ message: 'Input query parameter is required' });
        }

        const suggestions = await googleMapsService.getAutocompleteSuggestions(input);
        res.status(200).json(suggestions);
    } catch (error) {
        logger.error('Error getting autocomplete suggestions:', error);
        res.status(500).json({
            message: 'Error getting autocomplete suggestions',
            error: (error as Error).message
        });
    }
});

/**
 * @route POST /api/addresses/validate
 * @desc Validate an address using Google Place ID
 * @access Private
 * @body { placeId: string }
 */
router.post('/validate', async (req, res) => {
    try {
        const { placeId } = req.body;

        if (!placeId) {
            return res.status(400).json({ message: 'Place ID is required' });
        }

        const validatedAddress = await googleMapsService.validateAddressFromPlaceId(placeId);
        res.status(200).json(validatedAddress);
    } catch (error) {
        logger.error('Error validating address:', error);
        res.status(500).json({
            message: 'Error validating address',
            error: (error as Error).message
        });
    }
});

/**
 * @route POST /api/addresses/validate-string
 * @desc Validate an address from a string
 * @access Private
 * @body { address: string }
 */
router.post('/validate-string', async (req, res) => {
    try {
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({ message: 'Address string is required' });
        }

        const validatedAddress = await googleMapsService.validateAddressFromString(address);
        res.status(200).json(validatedAddress);
    } catch (error) {
        logger.error('Error validating address:', error);
        res.status(500).json({
            message: 'Error validating address',
            error: (error as Error).message
        });
    }
});

export default router;
