import { ExecutableResponse } from "google-auth-library/build/src/auth/executable-response";
import MProficiencies, { IProficiencyDocument } from "../db/models/MProficiencies.model";
import { Singleton } from "../models/classes/Singleton";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { LoggingService } from "./LoggingService";
import ISubject from "../models/interfaces/ISubject.interface";
import { IProficiency } from "../models/interfaces/IProficiency.interface";

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
    public async addOrUpdateProficiency(profData: IProficiency): Promise<IProficiencyDocument>{
        const prof = await MProficiencies.findOne({ name: profData.name });

        if(prof){
            profData.subjects.forEach((value: ISubject, key: string) => {
                prof.subjects.set(key, value);
            });
            return prof.save();
        }
        else{
            const newProf = new MProficiencies(profData);
            return newProf.save();
        }
    }

    public async updateProficiencyName(profId: string, newName: string): Promise<IProficiencyDocument | null>{
        return MProficiencies.findByIdAndUpdate(profId, { $set: { name: newName } }, { new: true });
    }

    public async deleteProficiency(profId: string): Promise<{ deletedCount: number }> {
        const result = await MProficiencies.deleteOne({ _id: profId });
        return result;
    }

    public async addOrUpdateSubject(profId: string, subjectKey: string, subjectData: ISubject): Promise<IProficiencyDocument | null>{
        return MProficiencies.findByIdAndUpdate(
            profId,
            { $set: { [`subjects.${subjectKey}`]: subjectData } },
            { new: true }
        );
    }

    public async deleteSubject(profId: string, subjectKey: string): Promise<IProficiencyDocument | null>{
        return MProficiencies.findByIdAndUpdate(
            profId,
            { $unset: { [`subjects.${subjectKey}`]: "" } },
            { new: true }
        );
    }

    public async getProficiencies(): Promise<IProficiencyDocument[]>{
        return MProficiencies.find();
    }
}

export default Singleton.getInstance(ProficiencyService);
