import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import IPayloadUser from "../models/interfaces/IPayloadUser.interface";

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload | IPayloadUser
        }
    }
}

export function authenticationMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies.session;

    if (!token) {
        return res.status(401).send("Unauthorized: No session token provided.");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

        req.user = decoded as IPayloadUser;

        next();
    } catch (error) {
        return res.status(403).send('Forbidden: Invalid session token.');
    }
}