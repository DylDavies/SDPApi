import mongoose from 'mongoose';
import { MongoService } from '../../src/app/services/MongoService';
import { Singleton } from '../../src/app/models/classes/Singleton';

// Mock mongoose
jest.mock('mongoose', () => ({
    connect: jest.fn()
}));

// Mock the Singleton class
jest.mock('../../src/app/models/classes/Singleton');

const MockedSingleton = Singleton as jest.Mocked<typeof Singleton>;

describe('MongoService', () => {
    const originalEnv = process.env;
    let mockLogger: any;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };

        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        (MockedSingleton.getInstance as jest.Mock).mockReturnValue(mockLogger);
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('constructor', () => {
        it('should throw an error if DB_CONN_STRING is not set', () => {
            delete process.env.DB_CONN_STRING;

            expect(() => new MongoService()).toThrow('DB_CONN_STRING is not set in environment variables.');
            expect(mockLogger.error).toHaveBeenCalledWith('Database connection string (DB_CONN_STRING) not found.');
        });

        it('should successfully create instance when DB_CONN_STRING is set', () => {
            process.env.DB_CONN_STRING = 'mongodb://localhost:27017/test';

            expect(() => new MongoService()).not.toThrow();
        });
    });

    describe('init', () => {
        it('should successfully connect to MongoDB', async () => {
            process.env.DB_CONN_STRING = 'mongodb://localhost:27017/test';
            process.env.DB_NAME = 'testdb';

            (mongoose.connect as jest.Mock).mockResolvedValue(undefined);

            const mongoService = new MongoService();
            await mongoService.init();

            expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test', {
                dbName: 'testdb'
            });
            expect(mockLogger.info).toHaveBeenCalledWith('Successfully connected to MongoDB database: testdb');
        });

        it('should connect without DB_NAME if not provided', async () => {
            process.env.DB_CONN_STRING = 'mongodb://localhost:27017/test';
            delete process.env.DB_NAME;

            (mongoose.connect as jest.Mock).mockResolvedValue(undefined);

            const mongoService = new MongoService();
            await mongoService.init();

            expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test', {
                dbName: undefined
            });
        });

        it('should throw an error if connection fails', async () => {
            process.env.DB_CONN_STRING = 'mongodb://localhost:27017/test';
            process.env.DB_NAME = 'testdb';

            const connectionError = new Error('Connection failed');
            (mongoose.connect as jest.Mock).mockRejectedValue(connectionError);

            const mongoService = new MongoService();

            await expect(mongoService.init()).rejects.toThrow('Connection failed');
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect to MongoDB via Mongoose', connectionError);
        });
    });
});
