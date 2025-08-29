import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../db/models/MAPIKey.model';
import { LoggingService } from '../services/LoggingService';
import { Singleton } from '../models/classes/Singleton';

const logger = Singleton.getInstance(LoggingService);

export const keyAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: Missing or invalid API key format.' });
    }

    const providedKey = authHeader.split(' ')[1];
    if (!providedKey) {
        return res.status(401).json({ message: 'Unauthorized: API key is missing.' });
    }

    try {
        const allKeys = await ApiKey.find({});
        let isValid = false;

        for (const keyDoc of allKeys) {
        const match = await keyDoc.compareKey(providedKey);
            if (match) {
                isValid = true;
                break;
            }
        }

        if (isValid) {
            return next();
        } else {
            return res.status(401).json({ message: 'Unauthorized: Invalid API key.' });
        }
    } catch (error) {
        logger.error('Error during API key authentication:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};