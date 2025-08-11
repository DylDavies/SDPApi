import { Request, Response, NextFunction } from "express";
import { LoggingService } from "../services/LoggingService";

const logger = LoggingService.getInstance();

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime();
    const { method, path, ip } = req;

    res.on('finish', () => {
        const { statusCode } = res;
        const diff = process.hrtime(start);
        const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);

        const logMessage = `${method} ${path} from ${ip} ${statusCode} - ${responseTime}ms`;

        // Log with different levels based on the status code for better visibility
        if (statusCode >= 500) {
            logger.error(logMessage);
        } else if (statusCode >= 400) {
            logger.warn(logMessage);
        } else {
            logger.info(logMessage);
        }
    });

    next();
}