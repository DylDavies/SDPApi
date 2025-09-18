import request from 'supertest';
import express from 'express';

process.env.EXTERNAL_API_BASE_URL = 'http://fakeapi.com';

// Define a variable to hold the mock logger
let mockLogger: {
    error: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
};

// Mock the Singleton to return our mock logger
// The mock MUST be defined inside the factory function to avoid initialization errors due to hoisting
jest.mock('../../../src/app/models/classes/Singleton', () => {
    // Initialize the mock logger inside the factory
    mockLogger = {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    };
    return {
        Singleton: {
            getInstance: jest.fn().mockReturnValue(mockLogger),
        },
    };
});

// Now, import the router which depends on the mocked Singleton
import consumeRouter from '../../../src/app/routes/external/consume/router';

// Mock the global fetch API
global.fetch = jest.fn();

const app = express();
app.use('/consume', consumeRouter);

describe('External Consume Router', () => {
    const mockStudyGroups = [{ id: 1, topic: 'Calculus' }];

    beforeEach(() => {
        // Clear mocks and set required environment variables before each test
        (global.fetch as jest.Mock).mockClear();
        mockLogger.error.mockClear();
        process.env.EXTERNAL_API_BASE_URL = 'http://fakeapi.com';
    });

    it('should fetch upcoming study groups and return them on success', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ studygroups: mockStudyGroups }),
        });

        const response = await request(app).get('/consume/studygroups/upcoming');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockStudyGroups);
        expect(global.fetch).toHaveBeenCalledWith('http://fakeapi.com/studygroups/scheduled/upcoming');
    });

    it('should handle non-ok responses from the external API and return the error', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 404,
            text: async () => 'Not Found',
        });

        const response = await request(app).get('/consume/studygroups/upcoming');

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Error fetching data from external API.');
        expect(response.body.error).toBe('Not Found');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('External API error: 404 - Not Found'));
    });

    it('should handle cases where the external API returns invalid or empty data', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ message: 'No study groups found' }), // Correctly structured but missing 'studygroups' key
        });

        const response = await request(app).get('/consume/studygroups/upcoming');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Invalid or empty data received from the external API.');
    });
    
    it('should handle exceptions when the fetch call fails', async () => {
        const fetchError = new Error('Network error');
        (global.fetch as jest.Mock).mockRejectedValue(fetchError);

        const response = await request(app).get('/consume/studygroups/upcoming');

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred.');
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch upcoming study groups:', fetchError);
    });
});
