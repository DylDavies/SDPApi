import { Types } from "mongoose";
import ISubject from "./ISubject.interface";

export interface IProficiency{
    _id?: Types.ObjectId;
    name: string;
    subjects: Map<string, ISubject>;
}