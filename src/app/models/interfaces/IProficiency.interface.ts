import ISubject from "./ISubject.interface";

export interface IProficiency{
    name: string;
    subjects: Map<string, ISubject>;
}