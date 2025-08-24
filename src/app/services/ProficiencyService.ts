import { WithId } from "mongodb";
import MProficiencies from "../db/models/MProficiencies.model";
import { Singleton } from "../models/classes/Singleton";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { LoggingService } from "./LoggingService";
import MongoServiceInstance, { MongoService as MongoServiceClass } from "./MongoService";

export class ProficiencyService implements IService {
    static addOrUpdateProficiency(prof: MProficiencies) {
        throw new Error("Method not implemented.");
    }
    
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;
    private _mongoService!: MongoServiceClass;
    private logger = Singleton.getInstance(LoggingService);

    constructor() {}

    public async init(): Promise<void>{
        this._mongoService = MongoServiceInstance;
        return Promise.resolve();
    }

    public async addOrUpdateProficiency(prof: MProficiencies): Promise<WithId<MProficiencies> | null>{
        try{
            const result =  await this._mongoService.getCollections().proficiences.findOneAndUpdate(
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
                    returnDocument: 'after'
                }
            );
            this.logger.info(`Proficiency added or updated: ${prof.name}`);
            return result as WithId<MProficiencies> | null; 
        }
        catch(error){
            this.logger.error("Error when adding or updating proficiency: ",error);
            return null;
        }     
    }

    public async getProficiences():Promise<WithId<MProficiencies>[] | null>{
        let profs;
        try{
            profs = await this._mongoService.getCollections().proficiences.find().toArray();
        }
        catch(error){
            this.logger.error("Error when fetching proficiencies: ", error);
            return null;
        }
        return profs as WithId<MProficiencies>[];
    }
}





export default Singleton.getInstance(ProficiencyService);
