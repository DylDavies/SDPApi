import cron from 'node-cron';
import UserService from '../services/UserService';
import { Singleton } from '../models/classes/Singleton';
import { LoggingService } from '../services/LoggingService';

const logger = Singleton.getInstance(LoggingService);

export function startBadgeCleanupJob() {
    // Schedule the job to run once every day at 3:00 AM
    cron.schedule('0 3 * * *', () => {
        logger.info('Running the scheduled job to clean up expired badges.');
        UserService.cleanupExpiredBadges().catch(err => {
            logger.error('Error during scheduled badge cleanup:', err);
        });
    });

    logger.info('Badge cleanup job has been scheduled to run daily at 3:00 AM.');
}