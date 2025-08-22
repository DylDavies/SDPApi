import { ObjectId } from "mongodb";
import { IModelConfig } from "../../models/interfaces/IModelConfig.interface";
import { ELeave } from "../../models/enums/ELeave.enum";


const config: IModelConfig = {
    collectionName: "leave"
}

export { config };

export default class MLeave {
    constructor(
        public tutorID: string,
        public tutorName: string,
        public reason: string,
        public startDate: Date,
        public endDate: Date,
        public approved: ELeave = ELeave.Pending,
        public _id?: ObjectId
    ) {}
}