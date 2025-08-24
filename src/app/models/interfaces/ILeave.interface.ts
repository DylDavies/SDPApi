import { ELeave } from "../enums/ELeave.enum"

export interface ILeave {
    id: string,
    reason: string,
    startDate: Date,
    endDate: Date,
    approved: ELeave
}