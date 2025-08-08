import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";

export class AuthService {
    private static instance: AuthService;
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    private constructor() {
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
}