import { Router } from "express";
import { GoogleService } from "../../services/GoogleService";
import jwt from "jsonwebtoken";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";

const router = Router();

router.get("/", (req, res) => {
    res.redirect("/auth/login");
})

router.get("/login", (req, res) => {
    res.redirect(GoogleService.getInstance().generateAuthUrl());
});

router.get("/callback", async (req, res) => {
    const googleService = GoogleService.getInstance();

    try {
        const { code } = req.query;

        if (!code || typeof code != "string") {
            return res.status(400).send("Authorization code missing or malformed.");
        }

        const { tokens } = await googleService.getTokens(code);
        const googleIdToken = tokens.id_token;

        if (!googleIdToken) {
            return res.status(400).send("Google ID Token not found.");
        }

        const ticket = await googleService.verifyIdToken(googleIdToken);

        const payload = ticket.getPayload();
        
        if (!payload) {
            return res.status(400).send('Invalid Google ID token.');
        }

        // TODO: Add to database

        const mockUser = {
            id: "internal-db-id",
            email: payload.email,
            name: payload.name,
            role: "user"
        }

        const jwtPayload: IPayloadUser = mockUser; // + any other info

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
        // TODO: add logging service logic here
        console.error(error);
    };
})

router.get("/logout", (req, res) => {
    res.clearCookie("session");
    res.status(200).send({ status: "success" });
});

export default router;