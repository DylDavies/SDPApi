import mongoose from 'mongoose';
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { LoggingService } from "./LoggingService";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";

/**
 * Manages the connection to the MongoDB database using Mongoose.
 * This service ensures a single, robust connection is established when the application starts.
 */
export class MongoService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.High;
    private logger = Singleton.getInstance(LoggingService);

    constructor() {
        if (!process.env.DB_CONN_STRING) {
            this.logger.error("Database connection string (DB_CONN_STRING) not found.");
            throw new Error("DB_CONN_STRING is not set in environment variables.");
        }
    }

    /**
     * Initializes the Mongoose connection to the MongoDB database.
     */
    public async init(): Promise<void> {
        try {
            // Mongoose handles connection pooling automatically.
            await mongoose.connect(process.env.DB_CONN_STRING as string, {
                dbName: process.env.DB_NAME
            });

            this.logger.info(`Successfully connected to MongoDB database: ${process.env.DB_NAME}`);

            // Optional: Enable Mongoose debug logging if needed
            // mongoose.set('debug', true);

        } catch (error) {
            this.logger.error("Failed to connect to MongoDB via Mongoose", error);
            // Propagate the error to stop the application startup if the DB connection fails.
            throw error;
        }
    }
}

export default Singleton.getInstance(MongoService);
