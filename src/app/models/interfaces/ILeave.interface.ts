import { ELeave } from "../enums/ELeave.enum"

export interface ILeave {
    _id: string,
    reason: string,
    startDate: Date,
    endDate: Date,
    approved: ELeave
}