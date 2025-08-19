import * as mongodb from "mongodb";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { LoggingService } from "./LoggingService";
import { readdirSync } from "fs";
import path from "path";
import { IModelConfig } from "../models/interfaces/IModelConfig.interface";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";

export class MongoService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.High;

    private _collections: { [key: string]: mongodb.Collection } = {};
    private _client: mongodb.MongoClient;
    private _db: mongodb.Db | null;
    private logger = Singleton.getInstance(LoggingService);

    constructor() {
        if (!process.env.DB_CONN_STRING) {
            this.logger.error("Database connection string (DB_CONN_STRING) not found.");
            throw new Error("DB_CONN_STRING is not set.");
        }
        this._client = new mongodb.MongoClient(process.env.DB_CONN_STRING as string);
        this._db = null;
    }

    public async init(): Promise<void> {
        try {
            await this._client.connect();
            this._db = this._client.db(process.env.DB_NAME);

            const modelsDir = path.join(__dirname, "../db/models");
            const modelFiles = readdirSync(modelsDir).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

            for (const modelFile of modelFiles) {
                // const { config }: { config: IModelConfig } = await import(path.join(__dirname, "../db/models", model));

                // this._collections[config.collectionName] = this._db.collection(config.collectionName);

                const { config }: { config: IModelConfig } = await import(path.join(modelsDir, modelFile));
                if (config && config.collectionName) {
                    this._collections[config.collectionName.toLowerCase()] = this._db.collection(config.collectionName);
                }
            }
            this.logger.info(`Successfully connected to database: ${this._db.databaseName}`);
        } catch (error) {
            this.logger.error("Failed to initialize MongoService", error);
            throw error;
        }
    }

    public getCollections(): { [key: string]: mongodb.Collection } {
        return this._collections;
    }
}

export default Singleton.getInstance(MongoService);