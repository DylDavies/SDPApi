import { Request, Response, NextFunction } from "express";
import { LoggingService } from "../services/LoggingService";

const logger = LoggingService.getInstance();

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {

    logger.info(`${req.method} ${req.path}`);

    next();
}