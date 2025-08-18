import { EUserRole } from "../enums/EUserRole.enum";

export default interface IPayloadUser {
    id: string,
    email: string,
    displayName: string,
    role: EUserRole
}