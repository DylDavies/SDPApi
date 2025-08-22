import { ObjectId, WithId } from "mongodb";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import MLeave from "../db/models/Mleave.model";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MongoServiceInstance, { MongoService as MongoServiceClass } from "./MongoService";
import { LoggingService } from "./LoggingService";

export class LeaveService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    private _mongoService!: MongoServiceClass;
    private logger = Singleton.getInstance(LoggingService);

    constructor() {}

    public async init(): Promise<void> {
        this._mongoService = MongoServiceInstance;
        return Promise.resolve();
    }

    public async addLeave(leave: MLeave): Promise<WithId<MLeave> | null> {
        const result = await this._mongoService.getCollections().leave.findOneAndUpdate(
            { tutorID: leave.tutorID},
            { 
                $set: {
                    approved: leave.approved,
                    startDate: leave.startDate,
                    endDate: leave.endDate
                },
                $setOnInsert: {
                    tutorID: leave.tutorID,
                    tutorName: leave.tutorName,
                    reason: leave.reason,
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                    approved: leave.approved
                    
                }
            },
            { 
                upsert: true,
                returnDocument: 'after'
            }
        );

        return result as WithId<MLeave> | null;
    }

    public async getLeave(id: string): Promise<WithId<MLeave> | null> {
        if (!id || !ObjectId.isValid(id)) {
            this.logger.warn(`Invalid ID string provided to getUser: "${id}"`);
            return null;
        }

        const leave = await this._mongoService.getCollections().leave.findOne({ _id: new ObjectId(id) });
        return leave as WithId<MLeave>;
    }
    
    

}

export default Singleton.getInstance(LeaveService);