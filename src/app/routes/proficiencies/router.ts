import { Router } from "express";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import ProficiencyService from "../../services/ProficiencyService";
import { LoggingService } from "../../services/LoggingService";
import { Singleton } from "../../models/classes/Singleton";
import { IProficiency } from "../../models/interfaces/IProficiency.interface";
import ISubject from "../../models/interfaces/ISubject.interface";

const router = Router();
const logger = Singleton.getInstance(LoggingService);
const proficiencyService = ProficiencyService;

router.use(authenticationMiddleware);

// POST /api/proficiencies - Create or update a proficiency syllabus
router.post("/", async(req, res) =>{
    try{
        const profData: IProficiency = req.body;
        
        if(!profData.name || !profData.subjects){
            return res.status(400).json({ error: "Missing name or subjects" });
        }

        const result = await proficiencyService.addOrUpdateProficiency(profData);
        res.status(201).json(result);
    } 
    catch(error){
        logger.error("Error in POST /proficiencies: ", error);
        res.status(500).json({ error: "Failed to add or update proficiency" });
    }
});

// GET /api/proficiencies - Fetch all proficiencies
router.get("/", async(req, res) =>{
    try{
        const profs = await proficiencyService.getProficiencies();
        return res.status(200).json(profs);
    } 
    catch(error){
        logger.error("Error in GET /proficiencies: ", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// PATCH /api/proficiencies/:profId - Update a proficiency's name
router.patch("/:profId", async (req, res) =>{
    try{
        const { profId } = req.params;
        const { newName } = req.body;
        
        if(!newName){
            return res.status(400).send("newName is required.");
        }

        const updatedProf = await proficiencyService.updateProficiencyName(profId, newName);
        res.status(200).json(updatedProf);
    } 
    catch (error){
        res.status(500).json({ message: "Error updating proficiency name", error: (error as Error).message });
    }
});

// DELETE /api/proficiencies/:profId - Delete a proficiency
router.delete("/:profId", async (req, res) =>{
    try{
        const { profId } = req.params;
        await proficiencyService.deleteProficiency(profId);
        res.status(200).json({ message: "Proficiency deleted successfully" });
    } 
    catch (error){
        res.status(400).json({ message: "Error deleting proficiency", error: (error as Error).message });
    }
});

// POST /api/proficiencies/:profId/subjects/:subjectKey - Add or update a subject in a proficiency
router.post("/:profId/subjects/:subjectKey", async (req, res) =>{
    try{
        const { profId, subjectKey } = req.params;
        const subjectData: ISubject = req.body;
        
        if(!subjectData || !subjectData.name || !subjectData.grades){
            return res.status(400).send("subjectData with name and grade is required.");
        }

        const updatedProf = await proficiencyService.addOrUpdateSubject(profId, subjectKey, subjectData);
        res.status(200).json(updatedProf);
    } 
    catch (error){
        res.status(500).json({ message: "Error adding subject", error: (error as Error).message });
    }
});

// DELETE /api/proficiencies/:profId/subjects/:subjectKey - Delete a subject from a proficiency
router.delete("/:profId/subjects/:subjectKey", async (req, res) =>{
    try{
        const { profId, subjectKey } = req.params;
        const updatedProf = await proficiencyService.deleteSubject(profId, subjectKey);
        res.status(200).json(updatedProf);
    } 
    catch (error){
        res.status(500).json({ message: "Error deleting subject", error: (error as Error).message });
    }
});


export default router;