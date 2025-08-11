import { MongoGCPError, WithId } from "mongodb";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import MUser from "../db/models/MUser.model";
import { MongoService } from "./MongoService";
import { EUserRole } from "../models/enums/EUserRole.enum";

export class UserService {
    private static instance: UserService;
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    private _mongoService: MongoService;

    private constructor() {
        this._mongoService = MongoService.getInstance();
    }

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
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