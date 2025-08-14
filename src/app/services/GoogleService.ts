import { OAuth2Client } from "google-auth-library";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { LoggingService } from "./LoggingService";
import { Singleton } from "../models/classes/Singleton";

export class GoogleService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    private _googleOAuth2: OAuth2Client;
    private logger = Singleton.getInstance(LoggingService);

    constructor() {
        const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI } = process.env;

        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !REDIRECT_URI) {
            this.logger.error("Google OAuth environment variables are not set.");
            throw new Error("Missing Google OAuth credentials in environment variables.");
        }

        this._googleOAuth2 = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
    }

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    public generateAuthUrl(): string {
        return this._googleOAuth2.generateAuthUrl({
            access_type: "offline",
            scope: [
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/userinfo.email"
            ],
            prompt: "select_account"
        });
    }

    public getTokens(code: string) {
        return this._googleOAuth2.getToken(code);
    }

    public async verifyIdToken(idToken: string) {
        return await this._googleOAuth2.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
    }
}

export default Singleton.getInstance(GoogleService);