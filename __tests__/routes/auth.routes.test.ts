import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const mockGoogleInstance = {
    getTokens: jest.fn(),
    verifyIdToken: jest.fn(),
    generateAuthUrl: jest.fn()
};

const mockMongoInstance = {
    getCollections: jest.fn(),
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const mockUserService = {
    addOrUpdateUser: jest.fn()
}

jest.mock('../../src/app/models/classes/Singleton', () => ({
    Singleton: {
        getInstance: jest.fn().mockImplementation((serviceClass: any) => {
            switch (serviceClass.name) {
                case 'GoogleService':
                    return mockGoogleInstance;
                case 'MongoService':
                    return mockMongoInstance;
                case 'UserService':
                    return mockUserService;
                case 'LoggingService':
                    return mockLogger;
                default:
                    console.error(`Singleton mock was called with an unhandled class: ${serviceClass.name}`);
                    return undefined;
            }
        })
    }
}));

jest.mock('jsonwebtoken');

describe('Auth Routes - /callback', () => {
    let authRouter: any;
    let callbackHandler: any;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    let mockGoogleInstance: any;
    let mockMongoInstance: any;
    let mockUserService: any;
    let mockLogger: any;
    let mockedJwt: jest.Mocked<typeof jwt>;

    beforeEach(() => {
        jest.resetModules();

        mockGoogleInstance = { getTokens: jest.fn(), verifyIdToken: jest.fn(), generateAuthUrl: jest.fn() };
        mockMongoInstance = { getCollections: jest.fn() };
        mockUserService = { addOrUpdateUser: jest.fn() };
        mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

        jest.mock('../../src/app/models/classes/Singleton', () => ({
            Singleton: {
                getInstance: jest.fn().mockImplementation((serviceClass: any) => {
                    switch (serviceClass.name) {
                        case 'GoogleService': return mockGoogleInstance;
                        case 'MongoService': return mockMongoInstance;
                        case 'UserService': return mockUserService;
                        case 'LoggingService': return mockLogger;
                    }
                })
            }
        }));

        jest.mock('jsonwebtoken');

        authRouter = require('../../src/app/routes/auth/router').default;
        mockedJwt = require('jsonwebtoken');

        const callbackLayer = authRouter.stack.find((layer: any) => layer.route && layer.route.path === '/callback');
        if (!callbackLayer || !callbackLayer.route) {
            throw new Error('Callback route not found on authRouter. Cannot run tests.');
        }
        callbackHandler = callbackLayer.route.stack[0].handle;

        mockRequest = { query: { code: 'valid-code' } };
        mockResponse = { status: jest.fn().mockReturnThis(), send: jest.fn(), redirect: jest.fn(), cookie: jest.fn() };
        nextFunction = jest.fn();
    });

    it('should status 200 and success message on successful authentication and user creation', async () => {
        mockGoogleInstance.getTokens.mockResolvedValue({ tokens: { id_token: 'fake-google-token' } });
        mockGoogleInstance.verifyIdToken.mockResolvedValue({
            getPayload: () => ({
                sub: 'google-user-123', email: 'test@example.com', name: 'Test User', picture: 'http://example.com/pic.jpg',
            }),
        } as any);
        mockUserService.addOrUpdateUser.mockResolvedValue({
            _id: { toHexString: () => 'mongo-id-123' }, 
            email: 'test@example.com', name: 'Test User', role: 'user' 
        })
        mockedJwt.sign.mockImplementation(() => 'fake-jwt-token');

        await callbackHandler(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockedJwt.sign).toHaveBeenCalled();
        expect(mockResponse.redirect).toHaveBeenCalledWith(`${process.env.FRONTEND_URL}/login/callback?token=fake-jwt-token`);
        expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 if authorization code is missing', async () => {
        mockRequest.query = {}; // No code
        await callbackHandler(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.send).toHaveBeenCalledWith('Authorization code missing or malformed.');
    });

    it('should return 400 if Google ID token is missing', async () => {
        mockGoogleInstance.getTokens.mockResolvedValue({ tokens: {} });
        await callbackHandler(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.send).toHaveBeenCalledWith('Google ID Token not found.');
    });
    
    it('should handle database errors gracefully', async () => {
        mockGoogleInstance.getTokens.mockResolvedValue({ tokens: { id_token: 'fake-google-token' } });
        mockGoogleInstance.verifyIdToken.mockResolvedValue({
            getPayload: () => ({ sub: 'google-user-123', email: 'test@example.com', name: 'Test User' }),
        } as any);
        mockUserService.addOrUpdateUser.mockRejectedValue(new Error('DB connection failed'))
        
        await callbackHandler(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith('An internal error occurred.');
    });
});
