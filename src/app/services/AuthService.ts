import { IUser } from "../models/interfaces/IUser.interface";

export class AuthService {
    private static instance: AuthService;

    private constructor() {
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public getUser(): IUser {
        return {name: "Hello World"}; // Get from DB
    }
}