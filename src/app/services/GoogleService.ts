import { OAuth2Client } from "google-auth-library";
import { EServiceLoadPriority } from "../models/enums/ServiceLoadPriority.enum";

export class GoogleService {
    private static instance: GoogleService;
    private _googleOAuth2: OAuth2Client;
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    private constructor() {
        this._googleOAuth2 = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.REDIRECT_URI);
    }

    public static getInstance(): GoogleService {
        if (!GoogleService.instance) {
            GoogleService.instance = new GoogleService();
        }
        return GoogleService.instance;
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