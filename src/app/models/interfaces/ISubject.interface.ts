import { Types } from "mongoose";

export default interface ISubject{
    _id?:Types.ObjectId;
    name: string;
    grades: string[];
}