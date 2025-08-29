import { ObjectId } from "mongodb";
import IGrade from "./IGrade.interface";

export default interface ISubject{
    name: string;
    grades: IGrade[];
    _id: ObjectId; // optional Id
}