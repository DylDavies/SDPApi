import { ObjectId } from "mongodb";
import { IModelConfig } from "../../models/interfaces/IModelConfig.interface";
import { EUserRole } from "../../models/enums/EUserRole.enum";
import {ILeave} from "../../models/interfaces/ILeave.interface";

const config: IModelConfig = {
    collectionName: "users"
}

export { config };

export default class MUser {
    constructor(
        public sub: string,
        public email: string,
        public picture: string = "",
        public displayName: string = "default",
        public role: EUserRole = EUserRole.User,
        public createdAt: Date = new Date(),
        public firstLogin: boolean = true,
        public leave: ILeave[] = [],
        public _id?: ObjectId
    ) {}
}