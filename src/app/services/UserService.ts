import { ObjectId, WithId } from "mongodb";
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

    public async getUser(id: ObjectId): Promise<WithId<MUser> | null> {
        const user = await this._mongoService.getCollections().users.findOne({ _id: id  });
        return user as WithId<MUser>;
    }

    
    public async editUser(id: ObjectId, updateData: Partial<MUser>): Promise<WithId<MUser> | null> {
        
        //Ensures only safe fields can be changed
        const safeFields: (keyof MUser)[] = ['role', 'email', 'displayName', 'picture'];
        const updatePayload: { [key: string]: any } = {}
        for (const key in updateData) {
        if(safeFields.includes(key as keyof MUser)){
            if (updateData[key as keyof MUser] !== undefined) {
            updatePayload[key] = updateData[key as keyof MUser];
        }
        }
    }

        const result = await this._mongoService.getCollections().users.findOneAndUpdate(
            {_id: id }, 
            { $set: updatePayload}, 
            { 
                returnDocument: 'after' 
            }
        );

        return result as WithId<MUser> | null;
    }

}

export default Singleton.getInstance(UserService);