import MProficiencies, { IProficiency } from "../db/models/MProficiencies.model";
import { Singleton } from "../models/classes/Singleton";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { LoggingService } from "./LoggingService";

export class ProficiencyService implements IService {    
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;
    private logger = Singleton.getInstance(LoggingService);

    public async init(): Promise<void>{
        return Promise.resolve();
    }

    /**
     * Adds a new proficiency or updates an existing one.
     * - If a proficiency by that name exists then that proficiency will be updated rather than creating a new one
     * @param prof The proficiency to add or update.
     * @returns The added or updated proficiency, or null if there was an error.
     */
    public async addOrUpdateProficiency(prof: IProficiency): Promise<IProficiency | null>{
        try{
            const result =  await MProficiencies.findOneAndUpdate(
                { name: prof.name },
                {
                    $set: {
                        subjects: prof.subjects,
                    },
                    $setOnInsert: {
                        name: prof.name
                    }
                },
                {
                    upsert: true,
                    new: true,
                    runValidators: true
                }
            );
            this.logger.info(`Proficiency added or updated: ${prof.name}`);
            return result;
        }
        catch(error){
            this.logger.error("Error when adding or updating proficiency: ",error);
            return null;
        }     
    }

    /**
     * Fetch all proficiencies from the database
     * @returns {Promise<IProficiency[] | null>} Array of proficiencies, or null if fetching fails.
     */

    public async getProficiences():Promise<IProficiency[] | null>{
        let profs;
        try{
            profs = await MProficiencies.find()
        }
        catch(error){
            this.logger.error("Error when fetching proficiencies: ", error);
            return null;
        }
        return profs;
    }
}

export default Singleton.getInstance(ProficiencyService);
