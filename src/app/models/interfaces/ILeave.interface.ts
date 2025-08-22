import { ELeave } from "../enums/ELeave.enum"

export default interface ILeave {
    id: string,
    tutorID: string,
    tutroName: string,
    reason: string,
    startDate: Date,
    endDate: Date,
    approved: ELeave
}