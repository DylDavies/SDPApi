
import { EMissionStatus } from "../enums/EMissions.enum";
import { IPopulatedUser } from "./IBundle.interface";


export interface IMissions{
    _id: string;
    bundleId: string;
    documentId: string;
    documentName: string;
    student: string | IPopulatedUser; // The ID of the student this bundle is for, or the populated student object
    tutor: string | IPopulatedUser;
    createdAt: Date;
    remuneration: number;
    commissionedBy: string | IPopulatedUser;
    hoursCompleted: number;
    dateCompleted: Date;
    status: EMissionStatus;
    updatedAt: Date; // Automatically managed by timestamps
}