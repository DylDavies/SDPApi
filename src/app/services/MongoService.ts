import * as mongodb from "mongodb";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { LoggingService } from "./LoggingService";
import { readdirSync } from "fs";
import path from "path";
import { IModelConfig } from "../models/interfaces/IModelConfig.interface";

export class MongoService {
    private static instance: MongoService;
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.High;

    private _collections: { [key: string]: mongodb.Collection } = {};
    private _client: mongodb.MongoClient;
    private _db: mongodb.Db | null;

    private constructor() {
        this._client = new mongodb.MongoClient(process.env.DB_CONN_STRING as string);
        this._db = null;

        this.init();
    }

    private async init() {
        await this._client.connect();

        this._db = this._client.db(process.env.DB_NAME);

        const models = readdirSync(path.join(__dirname, "../db/models"));

        for await (let model of models) {
            const { config }: { config: IModelConfig } = await import(path.join(__dirname, "../db/models", model));

            this._collections[config.collectionName] = this._db.collection(config.collectionName);
        }

        LoggingService.getInstance().info(`Successfully connected to database: ${this._db.databaseName}`);
    }

    public static getInstance(): MongoService {
        if (!MongoService.instance) {
            MongoService.instance = new MongoService();
        }
        return MongoService.instance;
    }

    public getCollections(): { [key: string]: mongodb.Collection } {
        return this._collections;
    }
}