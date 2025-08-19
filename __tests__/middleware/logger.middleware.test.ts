import { Request, Response, NextFunction } from 'express';

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

jest.mock("../../src/app/models/classes/Singleton.ts", () => ({
    Singleton: {
        getInstance: jest.fn().mockReturnValue(mockLogger)
    }
}));

import { loggerMiddleware } from '../../src/app/middleware/logger.middleware';

describe('loggerMiddleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockRequest = {
            method: 'GET',
            path: '/test',
            ip: '127.0.0.1',
        };

        mockResponse = {
            on: jest.fn().mockImplementation((event, callback) => {
                if (event === 'finish') {
                    callback();
                }
                return mockResponse as Response;
            }),
            statusCode: 200,
        };
    });

    it('should call next() to pass control to the next middleware', () => {
        loggerMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should log an info message for a successful request (status < 400)', () => {
        mockResponse.statusCode = 200;
        loggerMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('GET /test from 127.0.0.1 200'));
    });

    it('should log a warning message for a client error (status 400-499)', () => {
        mockResponse.statusCode = 404;
        loggerMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('GET /test from 127.0.0.1 404'));
    });

    it('should log an error message for a server error (status >= 500)', () => {
        mockResponse.statusCode = 500;
        loggerMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('GET /test from 127.0.0.1 500'));
    });
});
