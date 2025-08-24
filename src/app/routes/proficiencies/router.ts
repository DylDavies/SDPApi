import { Router } from "express";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import MProficiencies from "../../db/models/MProficiencies.model";
import ProficiencyService from "../../services/ProficiencyService";
import { LoggingService } from "../../services/LoggingService";
import { Singleton } from "../../models/classes/Singleton";

const router = Router();
// const proficiencyService = Singleton.getInstance(ProficiencyService);
const logger = Singleton.getInstance(LoggingService);

//router.use(authenticationMiddleware);

router.post("/", async(req, res) =>{
    const { name ,subjects } = req.body;

    if(!name || !subjects){
        return res.status(400).json({ eror: "Missing name or subjects" });
    }

    const prof = new MProficiencies(name, subjects);
    const result = await ProficiencyService.addOrUpdateProficiency(prof);

    if(result){
        res.status(201).json(result);
    }
    else{
        res.status(500).json({ error: "failed to add or update proficiency" });
    }
});

export default router;