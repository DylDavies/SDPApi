import { Router } from "express";
import { GoogleService } from "../../services/GoogleService";
import jwt from "jsonwebtoken";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { LoggingService } from "../../services/LoggingService";
import MUser from "../../db/models/MUser.model";
import { UserService } from "../../services/UserService";
import { Singleton } from "../../models/classes/Singleton";

const router = Router();
const logger = Singleton.getInstance(LoggingService);

router.get("/", (req, res) => {
    res.redirect("/auth/login");
})

router.get("/login", (req, res) => {
    res.redirect(Singleton.getInstance(GoogleService).generateAuthUrl());
});

router.get("/callback", async (req, res) => {
    const googleService = Singleton.getInstance(GoogleService);

    try {
        const { code } = req.query;

        if (!code || typeof code != "string") {
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
        
        if (!payload || !payload.sub || !payload.email) {
            logger.error("Invalid Google ID token payload.", payload);
            return res.status(400).send('Invalid Google ID token.');
        }

        const userFromDb = await Singleton.getInstance(UserService)
            .addOrUpdateUser(new MUser(
                payload.sub,
                payload.email,
                payload.picture
            ));

        if (!userFromDb) {
            logger.error("Failed to find or create user in the database.", { sub: payload.sub });
            return res.status(500).send("Could not process user login.");
        }

        const jwtPayload: IPayloadUser = {
            id: userFromDb._id.toHexString(),
            email: userFromDb.email,
            displayName: userFromDb.displayName,
            role: userFromDb.role
        };

        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET as string, {
            expiresIn: "14d"
        })

        const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days

        res.cookie("session", token, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        });

        res.redirect("/");
    } catch (error) {
        logger.error("An error occurred during the auth callback process.", error);
        res.status(500).send("An internal error occurred.");
    };
})

router.post("/logout", (req, res) => {
    res.clearCookie("session");
    res.status(200).send({ status: "success" });
});

export default router;