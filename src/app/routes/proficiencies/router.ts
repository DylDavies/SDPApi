import { Router } from "express";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import MProficiencies from "../../db/models/MProficiencies.model";
import ProficiencyService from "../../services/ProficiencyService";
import { LoggingService } from "../../services/LoggingService";
import { Singleton } from "../../models/classes/Singleton";

const router = Router();
const logger = Singleton.getInstance(LoggingService);

router.use(authenticationMiddleware);
/**
 * @oute POST/
 * @description Creates a new proficiency or updates an existing one
 * @access Protected required authentication
 * 
 * - Validates that the name and subjects are provided in the body
 * - If a proficiency with that name exists then it will simply update that proficiency instead 
 *   of creating a new proficiency, by adding new subjects and or grades for that subject
 */

router.post("/", async(req, res) =>{
    try{
        const { name ,subjects } = req.body;

        if(!name || !subjects){
            return res.status(400).json({ error: "Missing name or subjects" });
        }

        const prof = new MProficiencies({ name, subjects });
        const result = await ProficiencyService.addOrUpdateProficiency(prof);

        if(result){
            res.status(201).json(result);
        }
        else{
            res.status(500).json({ error: "failed to add or update proficiency"});
        }
    }
    catch(error){
        logger.error("Error updating or adding a proficiency: ", error);
        res.status(403).json({ error: "Error updating or adding a proficiency" });
    }
});

/**
 * @route GET /fetchAll
 * @description Fetch all proficiencies
 * @access Protected required authentication
 * 
 * @returns {200 Okay} JSON array of all proficiencies from the database
 * @returns {500 Internal Server Error} If there was an error fetching the proficiencies
 */

router.get("/fetchAll", async(req, res) =>{
    try{
        const profs = await ProficiencyService.getProficiences();

        if(!profs){
            logger.error("Proficiencies not returned");
            return res.status(500).json({ error: "Failed to fetch proficiencies"});
        }

        return res.status(200).json(profs);
    }
    catch(error){
        logger.error("Error fetching proficiencies: ", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

export default router;