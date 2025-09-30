import request from 'supertest';
import express, { Express } from 'express';
import externalRoutes from "../../src/app/routes/external/router";
import { ApiKey, IApiKey } from '../../src/app/db/models/MAPIKey.model';
import UserService from '../../src/app/services/UserService';
import ProficiencyService from '../../src/app/services/ProficiencyService';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';

// --- Mocking Dependencies ---
// Mock the Mongoose model to avoid actual database calls
jest.mock('../../src/app/db/models/MAPIKey.model');
const MockApiKey = ApiKey as jest.Mocked<typeof ApiKey>;

// Mock the services
jest.mock('../../src/app/services/UserService');
const MockUserService = UserService as jest.Mocked<typeof UserService>;

jest.mock('../../src/app/services/ProficiencyService');
const MockProficiencyService = ProficiencyService as jest.Mocked<typeof ProficiencyService>;

// --- Test Setup ---
const app: Express = express();
app.use(express.json());
app.use('/api/external', externalRoutes);

describe('External Staff API', () => {
  const plainTextKey = 'test-api-key-12345';
  let mockKeyDoc: Partial<IApiKey>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup a mock document that our ApiKey.find will return
    mockKeyDoc = {
      clientName: 'TestClient',
      key: 'hashed_key_string',
      compareKey: jest.fn().mockImplementation(async (candidateKey: string) => {
        return candidateKey === plainTextKey;
      }),
    };

    (MockApiKey.find as jest.Mock).mockResolvedValue([mockKeyDoc]);
  });

  // --- Middleware Tests ---
  describe('keyAuth Middleware', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const response = await request(app).get('/api/external/tutors');
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Missing or invalid API key format');
    });

    it('should return 401 if Authorization header is not in "Bearer <token>" format', async () => {
      const response = await request(app)
        .get('/api/external/tutors')
        .set('Authorization', 'InvalidFormat');
      expect(response.status).toBe(401);
    });

    it('should return 401 if the API key is invalid', async () => {
      const response = await request(app)
        .get('/api/external/tutors')
        .set('Authorization', 'Bearer invalid-key');
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid API key');
    });

    it('should return 401 if Authorization header has no key after Bearer', async () => {
        const response = await request(app)
            .get('/api/external/tutors')
            .set('Authorization', 'Bearer ');
        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Unauthorized: Missing or invalid API key format.');
    });

    it('should return 500 if there is a database error', async () => {
        (MockApiKey.find as jest.Mock).mockRejectedValue(new Error('DB connection failed'));
        const response = await request(app)
            .get('/api/external/tutors')
            .set('Authorization', `Bearer ${plainTextKey}`);
        expect(response.status).toBe(500);
        expect(response.body.message).toContain('Internal Server Error');
    });

    it('should call next() if the API key is valid', async () => {
      // For this test, we just need to confirm it doesn't return 401.
      // We'll mock the service to prevent errors in the actual route handler.
      (MockUserService.getAllUsers as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/external/tutors')
        .set('Authorization', `Bearer ${plainTextKey}`);
      
      // If the status is 200, it means the middleware successfully called next()
      expect(response.status).toBe(200);
    });
  });

  // --- Route Tests ---
  describe('GET /api/external/tutors', () => {
    it('should return 200 and stripped staff data with a valid API key', async () => {
      // Arrange: Setup mock data for the UserService
      const mockUsers = [
        { _id: '1', displayName: 'Admin User', email: 'admin@test.com', type: EUserType.Admin, roles: [{ name: 'Super Admin' }], proficiencies: [] },
        { _id: '2', displayName: 'Staff User', email: 'staff@test.com', type: EUserType.Staff, roles: [{ name: 'Tutor' }], proficiencies: ['Math'] },
        { _id: '3', displayName: 'Client User', email: 'client@test.com', type: EUserType.Client, roles: [], proficiencies: [] }, // This user should be filtered out
      ];
      (MockUserService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
      
      // Act: Make the request
      const response = await request(app)
        .get('/api/external/tutors')
        .set('Authorization', `Bearer ${plainTextKey}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2); // Only Admin and Staff should be included
      expect(response.body[0].name).toBe('Admin User');
      expect(response.body[1].proficiencies).toEqual(['Math']);
      expect(response.body[0].id).toBeDefined();
      expect(response.body[0].roles).toEqual(['Super Admin']);
      // Ensure sensitive data is NOT present
      expect(response.body[0].type).toBeUndefined(); 
    });
  });

  describe('GET /api/external/proficiencies', () => {
    it('should return 200 and a list of proficiencies with a valid API key', async () => {
      // Arrange
      const mockProfs = [{ _id: 'p1', name: 'Calculus' }, { _id: 'p2', name: 'Physics' }];
      (MockProficiencyService.getProficiencies as jest.Mock).mockResolvedValue(mockProfs);

      // Act
      const response = await request(app)
        .get('/api/external/proficiencies')
        .set('Authorization', `Bearer ${plainTextKey}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Calculus');
    });
  });
});
