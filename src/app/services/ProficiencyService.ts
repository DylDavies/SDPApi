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

    public async addOrUpdateProficiency(prof: IProficiency): Promise<IProficiency | null>{
        try{
            const result =  MProficiencies.findOneAndUpdate(
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
