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
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/user.addresses.read"
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

    public async getUserAddresses(accessToken: string) {
        try {
            const response = await fetch(
                'https://people.googleapis.com/v1/people/me?personFields=addresses',
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            if (!response.ok) {
                this.logger.warn(`Failed to fetch user addresses: ${response.statusText}`);
                return null;
            }

            const data = await response.json();

            // Google returns addresses as an array, we'll take the first one
            if (data.addresses && data.addresses.length > 0) {
                const address = data.addresses[0];
                return {
                    streetAddress: address.streetAddress || undefined,
                    city: address.city || undefined,
                    state: address.region || undefined,
                    postalCode: address.postalCode || undefined,
                    country: address.country || undefined,
                    formattedAddress: address.formattedValue || undefined
                };
            }

            return null;
        } catch (error) {
            this.logger.error('Error fetching user addresses from Google:', error);
            return null;
        }
    }
}

export default Singleton.getInstance(GoogleService);