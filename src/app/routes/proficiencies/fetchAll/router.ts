import { Router } from "express";
import { authenticationMiddleware } from "../../../middleware/auth.middleware";
import MProficiencies from "../../../db/models/MProficiencies.model";
import ProficiencyService from "../../../services/ProficiencyService";
import { LoggingService } from "../../../services/LoggingService";
import { Singleton } from "../../../models/classes/Singleton";

const router = Router();
// const proficiencyService = Singleton.getInstance(ProficiencyService);
const logger = Singleton.getInstance(LoggingService);

//router.use(authenticationMiddleware);

router.get("/", async(req, res) =>{
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