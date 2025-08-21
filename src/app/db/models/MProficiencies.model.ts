import { ObjectId } from "mongodb";
import { IModelConfig } from "../../models/interfaces/IModelConfig.interface";
import ISubject from "../../models/interfaces/ISubject.interface";

const config: IModelConfig = {
    collectionName: "proficiences"
}

export { config };

export default class MProficiencies {
    constructor(
        public name: string,
        public subjects: ISubject,
        public _id?: ObjectId
    ) {}
}