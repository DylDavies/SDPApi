import { WithId } from "mongodb";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import MUser from "../db/models/MUser.model";
import { MongoService } from "./MongoService";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MongoServiceInstance, { MongoService as MongoServiceClass } from "./MongoService";

export class UserService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    private _mongoService!: MongoServiceClass;

    constructor() {}

    public async init(): Promise<void> {
        this._mongoService = MongoServiceInstance;
        return Promise.resolve();
    }

    public async addOrUpdateUser(user: MUser): Promise<WithId<MUser> | null> {
        const result = await this._mongoService.getCollections().users.findOneAndUpdate(
            { sub: user.sub },
            { 
                $set: {
                    email: user.email,
                    picture: user.picture,
                },
                $setOnInsert: {
                    sub: user.sub,
                    role: user.role,
                    displayName: user.displayName,
                    createdAt: user.createdAt,
                }
            },
            { 
                upsert: true,
                returnDocument: 'after'
            }
        );

        return result as WithId<MUser> | null;
    }
}

export default Singleton.getInstance(UserService);