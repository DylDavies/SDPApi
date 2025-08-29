import MProficiencies, { IProficiencyDocument } from "../db/models/MProficiencies.model";
import { Singleton } from "../models/classes/Singleton";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import ISubject from "../models/interfaces/ISubject.interface";
import { IProficiency } from "../models/interfaces/IProficiency.interface";
import { LoggingService } from "./LoggingService";

export class ProficiencyService implements IService {    
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;
    private logger = Singleton.getInstance(LoggingService);

    public async init(): Promise<void>{
        return Promise.resolve();
    }

    /**
     * Adds a new proficiency or updates an existing one by merging subjects.
     * @param profData The proficiency data to add or update.
     * @returns The added or updated proficiency document, or null if an error occurs.
     */
    public async addOrUpdateProficiency(profData: IProficiency): Promise<IProficiencyDocument | null>{
        try {
            const prof = await MProficiencies.findOne({ name: profData.name });
            const subjectsMap = new Map<string, ISubject>(Object.entries(profData.subjects));
    
            if(prof){
                subjectsMap.forEach((value: ISubject, key: string) => {
                    prof.subjects.set(key, value);
                });
                return prof.save();
            }
            else{
                const newProfData = {
                    name: profData.name,
                    subjects: subjectsMap
                };
                const newProf = new MProficiencies(newProfData);
                return newProf.save();
            }
        } catch (error) {
            this.logger.error("Error in addOrUpdateProficiency: ", error);
            return null;
        }
    }

    /**
     * Updates the name of a proficiency.
     * @param profId The ID of the proficiency to update.
     * @param newName The new name for the proficiency.
     * @returns The updated proficiency document, or null if not found.
     */
    public async updateProficiencyName(profId: string, newName: string): Promise<IProficiencyDocument | null>{
        return MProficiencies.findByIdAndUpdate(profId, { $set: { name: newName } }, { new: true });
    }

    /**
     * Deletes a proficiency by its ID.
     * @param profId The ID of the proficiency to delete.
     * @returns An object containing the number of documents deleted.
     */
    public async deleteProficiency(profId: string): Promise<{ deletedCount: number }> {
        const result = await MProficiencies.deleteOne({ _id: profId });
        return result;
    }


    /**
     * Adds or updates a subject within a specific proficiency.
     * @param profId The ID of the proficiency.
     * @param subjectKey The key identifying the subject.
     * @param subjectData The data for the subject to add or update.
     * @returns The updated proficiency document, or null if not found.
     */
    public async addOrUpdateSubject(profId: string, subjectKey: string, subjectData: ISubject): Promise<IProficiencyDocument | null>{
        return MProficiencies.findByIdAndUpdate(
            profId,
            { $set: { [`subjects.${subjectKey}`]: subjectData } },
            { new: true }
        );
    }


    /**
     * Deletes a subject from a specific proficiency.
     * @param profId The ID of the proficiency.
     * @param subjectKey The key of the subject to delete.
     * @returns The updated proficiency document, or null if not found.
     */
    public async deleteSubject(profId: string, subjectKey: string): Promise<IProficiencyDocument | null>{
        return MProficiencies.findByIdAndUpdate(
            profId,
            { $unset: { [`subjects.${subjectKey}`]: "" } },
            { new: true }
        );
    }

    /**
     * Retrieves all proficiencies from the database.
     * @returns An array of all proficiency documents.
     */
    public async getProficiencies(): Promise<IProficiencyDocument[]>{
        return MProficiencies.find();
    }
}

export default Singleton.getInstance(ProficiencyService);
