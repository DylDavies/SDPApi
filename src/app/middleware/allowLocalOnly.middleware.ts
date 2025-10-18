import { Request, Response, NextFunction } from "express";

/**
 * Middleware to allow requests only from localhost.
 * This is crucial for securing prerendering endpoints, especially when behind a reverse proxy like Nginx.
 */
export function allowLocalOnly (req: Request, res: Response, next: NextFunction) {
    // 'req.ip' is the most reliable way as it respects Express's "trust proxy" setting.
    // Falls back to checking the socket's remote address.
    const ip = req.ip || req.socket.remoteAddress;

    // Allow IPv4 and IPv6 loopback addresses
    const allowedIps = ['127.0.0.1', '::1'];

    if (allowedIps.includes(ip!)) {
        // If the request is from localhost, proceed to the route handler
        next();
    } else {
        // If the request is from any other IP, deny access
        res.status(403).json({ message: "Forbidden: Access is restricted to the local server." });
    }
};