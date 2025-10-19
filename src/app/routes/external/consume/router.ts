import express from 'express';
import { Singleton } from '../../../models/classes/Singleton';
import { LoggingService } from '../../../services/LoggingService';

const router = express.Router();

const logger = Singleton.getInstance(LoggingService);

const BASE_URL = process.env.EXTERNAL_API_BASE_URL;

if (!BASE_URL) {
    logger.error("External API URL (EXTERNAL_API_BASE_URL) not found.");
    throw new Error("EXTERNAL_API_BASE_URL is not set in environment variables.");
}


router.get("/studygroups", async (req, res) => {
    try {
        const response = await fetch(BASE_URL + "/studygroups");

        if (!response.ok) {
            const errorData = await response.text();
            logger.error(`External API error: ${response.status} - ${errorData}`);
            return res.status(response.status).send({
                message: "Error fetching data from external API.",
                error: errorData 
            });
        }

        const data = await response.json();

        if (!data || !data.studygroups) {
            return res.status(500).send({ message: "Invalid or empty data received from the external API." });
        }

        res.json(data.studygroups);
    } catch (error) {
        logger.error("Failed to fetch upcoming study groups:", error);
        res.status(500).send({ message: "An unexpected error occurred." });
    }
});

export default router;
