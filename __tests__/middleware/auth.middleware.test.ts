import { Request, Response, NextFunction } from 'express';
import { authenticationMiddleware } from '../../src/app/middleware/auth.middleware';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('authMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        jest.resetAllMocks();
        mockRequest = {
            headers: {}
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    it('should return 401 if no session cookie is provided', () => {
        authenticationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized: No session token provided.');
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if the token is invalid or expired', () => {
        mockRequest.headers!.authorization = 'Bearer invalid-token';
        mockedJwt.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });

        authenticationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.send).toHaveBeenCalledWith('Forbidden: Invalid session token.');
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() if token is valid', () => {
        const validToken = 'Bearer valid-token';
        const userPayload = { userId: '123', email: 'test@example.com' };
        mockRequest.headers!.authorization = validToken;
        
        mockedJwt.verify.mockImplementation(() => userPayload);

        authenticationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockedJwt.verify).toHaveBeenCalledWith(validToken.split(" ")[1], process.env.JWT_SECRET);
        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockResponse.status).not.toHaveBeenCalled();
    });
});