import * as mongodb from "mongodb";
import { IMongoCollections } from "../models/interfaces/IMongoCollections.interfance";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { LoggingService } from "./LoggingService";

export class MongoService {
    private static instance: MongoService;
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.High;

    private _collections: IMongoCollections = {};
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

        this._collections.games = this._db.collection("games");

        LoggingService.getInstance().info(`Successfully connected to database: ${this._db.databaseName}`);
    }

    public static getInstance(): MongoService {
        if (!MongoService.instance) {
            MongoService.instance = new MongoService();
        }
        return MongoService.instance;
    }

    public getCollections(): IMongoCollections {
        return this._collections;
    }
}