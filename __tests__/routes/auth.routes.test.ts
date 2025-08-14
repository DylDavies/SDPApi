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

jest.mock('../../src/app/services/GoogleService', () => ({
    GoogleService: {
        getInstance: () => mockGoogleInstance,
    },
}));
jest.mock('../../src/app/services/MongoService', () => ({
    MongoService: {
        getInstance: () => mockMongoInstance,
    },
}));
jest.mock('../../src/app/services/LoggingService', () => ({
    LoggingService: { getInstance: () => mockLogger },
}));
jest.mock('jsonwebtoken');

import authRouter from '../../src/app/routes/auth/router';

const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Routes - /callback', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    const callbackLayer = authRouter.stack.find(layer => layer.route && layer.route.path === '/callback');
    if (!callbackLayer || !callbackLayer.route) {
        throw new Error('Callback route not found on authRouter. Cannot run tests.');
    }
    const callbackHandler = callbackLayer.route.stack[0].handle;

    beforeEach(() => {
        jest.resetAllMocks();
        
        mockRequest = {
            query: { code: 'valid-code' },
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            redirect: jest.fn(),
            cookie: jest.fn(),
        };
    });

    it('should redirect to / on successful authentication and user creation', async () => {
        mockGoogleInstance.getTokens.mockResolvedValue({ tokens: { id_token: 'fake-google-token' } });
        mockGoogleInstance.verifyIdToken.mockResolvedValue({
            getPayload: () => ({
                sub: 'google-user-123', email: 'test@example.com', name: 'Test User', picture: 'http://example.com/pic.jpg',
            }),
        } as any);
        mockMongoInstance.getCollections.mockReturnValue({
            users: {
                findOneAndUpdate: jest.fn().mockResolvedValue({
                    _id: { toHexString: () => 'mongo-id-123' }, 
                    email: 'test@example.com', name: 'Test User', role: 'user' 
                })
            }
        } as any);
        mockedJwt.sign.mockImplementation(() => 'fake-jwt-token');

        await callbackHandler(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockedJwt.sign).toHaveBeenCalled();
        expect(mockResponse.cookie).toHaveBeenCalledWith('session', 'fake-jwt-token', expect.any(Object));
        expect(mockResponse.redirect).toHaveBeenCalledWith('/');
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
        mockMongoInstance.getCollections.mockReturnValue({
            users: {
                findOneAndUpdate: jest.fn().mockRejectedValue(new Error('DB connection failed'))
            }
        } as any);
        
        await callbackHandler(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.send).toHaveBeenCalledWith('An internal error occurred.');
    });
});
