import { ELeave } from "../enums/ELeave.enum"

export interface ILeave {
    id: string,
    tutorName: string,
    reason: string,
    startDate: Date,
    endDate: Date,
    approved: ELeave
}