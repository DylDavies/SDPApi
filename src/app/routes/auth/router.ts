import { Router } from "express";
import jwt from "jsonwebtoken";
import { GoogleService } from "../../services/GoogleService";
import { LoggingService } from "../../services/LoggingService";
import { UserService } from "../../services/UserService";
import { Singleton } from "../../models/classes/Singleton";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { IRole } from "../../db/models/MRole.model";
import { EPermission } from "../../models/enums/EPermission.enum";

const router = Router();
const logger = Singleton.getInstance(LoggingService);

router.get("/login", (req, res) => {
    res.redirect(Singleton.getInstance(GoogleService).generateAuthUrl());
});

router.get("/callback", async (req, res) => {
    const googleService = Singleton.getInstance(GoogleService);
    const userService = Singleton.getInstance(UserService);

    try {
        const { code } = req.query;
        if (!code || typeof code !== "string") {
            logger.warn("Authorization code missing from callback.");
            return res.status(400).send("Authorization code missing or malformed.");
        }

        const { tokens } = await googleService.getTokens(code);
        const googleIdToken = tokens.id_token;
        if (!googleIdToken) {
            logger.error("Google ID Token not found in token response.");
            return res.status(400).send("Google ID Token not found.");
        }

        const ticket = await googleService.verifyIdToken(googleIdToken);
        const payload = ticket.getPayload();
        if (!payload || !payload.sub || !payload.email || !payload.name) {
            logger.error("Invalid Google ID token payload.", payload);
            return res.status(400).send('Invalid Google ID token.');
        }

        const userFromDb = await userService.addOrUpdateUser({
            googleId: payload.sub,
            email: payload.email,
            displayName: payload.name,
            picture: payload.picture
        });

        if (!userFromDb) {
            logger.error("Failed to find or create user in the database.", { sub: payload.sub });
            return res.status(500).send("Could not process user login.");
        }

        // Fetch the user's roles and populate the permissions for each role
        const userWithRoles = await userFromDb.populate<{ roles: IRole[] }>('roles');
        
        // Calculate the complete, unique set of permissions for the user
        const userPermissions = new Set<EPermission>();
        if (userWithRoles.roles) {
            for (const role of userWithRoles.roles) {
                for (const permission of role.permissions) {
                    userPermissions.add(permission);
                }
            }
        }
        
        // Create the new JWT payload
        const jwtPayload: IPayloadUser = {
            id: userFromDb._id.toHexString(),
            email: userFromDb.email,
            displayName: userFromDb.displayName,
            firstLogin: userFromDb.firstLogin,
            permissions: Array.from(userPermissions),
            type: userFromDb.type
        };

        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET as string, {
            expiresIn: "14d"
        });

        res.redirect(`${process.env.FRONTEND_URL}/login/callback?token=${token}`);

    } catch (error) {
        logger.error("An error occurred during the auth callback process.", error);
        res.status(500).send("An internal error occurred.");
    }
});

router.post("/logout", (req, res) => {
    // This endpoint can remain simple as the token is managed on the client
    res.status(200).send({ status: "success" });
});

export default router;
