import { OAuth2Client } from 'google-auth-library';
import { GoogleService } from '../../src/app/services/GoogleService';
import { Singleton } from '../../src/app/models/classes/Singleton';

// This object will hold the mocked instance methods of the OAuth2Client.
const mockOAuthClientInstance = {
    generateAuthUrl: jest.fn(),
    getToken: jest.fn(),
    verifyIdToken: jest.fn(),
};

jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => mockOAuthClientInstance),
}));

// Mock the Singleton class to control how services are instantiated.
jest.mock('../../src/app/models/classes/Singleton');

// Create typed handles to the mocked classes for assertions.
const MockedOAuth2Client = OAuth2Client as unknown as jest.Mock;
const MockedSingleton = Singleton as jest.Mocked<typeof Singleton>;

describe('GoogleService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Restore environment variables to a clean state for each test.
        process.env = { ...originalEnv };
        // Clear any previous mock calls to ensure test isolation.
        jest.clearAllMocks();

        (MockedSingleton.getInstance as jest.Mock).mockImplementation(() => {
            return {
                error: jest.fn()
            }
        })
    });

    afterAll(() => {
        // Restore the original environment after all tests in this file complete.
        process.env = originalEnv;
    });

    describe('constructor', () => {
        it('should throw an error if Google OAuth environment variables are not set', () => {
            // Unset a required variable.
            delete process.env.GOOGLE_CLIENT_ID;
            
            // Expect the constructor to throw when a new instance is created.
            expect(() => new GoogleService()).toThrow('Missing Google OAuth credentials in environment variables.');
        });

        it('should successfully create an OAuth2Client instance when variables are present', () => {
            process.env.GOOGLE_CLIENT_ID = 'test-client-id';
            process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
            process.env.REDIRECT_URI = 'http://localhost/callback';
            
            // Manually create an instance to test the constructor's logic.
            new GoogleService();

            // Verify that the mocked constructor was called with the correct credentials.
            expect(MockedOAuth2Client).toHaveBeenCalledWith(
                'test-client-id',
                'test-client-secret',
                'http://localhost/callback'
            );
        });
    });

    describe('service methods', () => {
        let googleService: GoogleService;

        beforeEach(() => {
            // Set up the environment for all tests in this block.
            process.env.GOOGLE_CLIENT_ID = 'test-client-id';
            process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
            process.env.REDIRECT_URI = 'http://localhost/callback';

            // Create a fresh instance of the service for each test.
            googleService = new GoogleService();

            // Configure the mocked Singleton to return our instance.
            (MockedSingleton.getInstance as jest.Mock).mockReturnValue(googleService);
        });

        it('init should resolve successfully', async () => {
            await expect(googleService.init()).resolves.toBeUndefined();
        });

        it('generateAuthUrl should call the underlying method with correct scopes', () => {
            const expectedUrl = 'https://auth.google.com/mock-url';
            mockOAuthClientInstance.generateAuthUrl.mockReturnValue(expectedUrl);

            const url = googleService.generateAuthUrl();

            expect(mockOAuthClientInstance.generateAuthUrl).toHaveBeenCalledWith({
                access_type: "offline",
                scope: [
                    "https://www.googleapis.com/auth/userinfo.profile",
                    "https://www.googleapis.com/auth/userinfo.email"
                ],
                prompt: "select_account"
            });
            expect(url).toBe(expectedUrl);
        });

        it('getTokens should call the underlying getToken method', async () => {
            const authCode = 'test-auth-code';
            const expectedTokens = { access_token: 'test-access-token' };
            mockOAuthClientInstance.getToken.mockResolvedValue(expectedTokens);

            const tokens = await googleService.getTokens(authCode);

            expect(mockOAuthClientInstance.getToken).toHaveBeenCalledWith(authCode);
            expect(tokens).toEqual(expectedTokens);
        });

        it('verifyIdToken should call the underlying verifyIdToken method', async () => {
            const idToken = 'test-id-token';
            const expectedTicket = { getPayload: () => ({ sub: '123' }) };
            mockOAuthClientInstance.verifyIdToken.mockResolvedValue(expectedTicket as any);

            const ticket = await googleService.verifyIdToken(idToken);

            expect(mockOAuthClientInstance.verifyIdToken).toHaveBeenCalledWith({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            expect(ticket).toEqual(expectedTicket);
        });
    });
});

