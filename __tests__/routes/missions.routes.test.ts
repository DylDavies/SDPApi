import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { EMissionStatus } from '../../src/app/models/enums/EMissions.enum';
import { Types } from 'mongoose';
import { IMissions } from '../../src/app/db/models/MMissions.model';
// --- Mock Services ---
const mockMissionsService = {
  getMission: jest.fn(),
  getMissionById: jest.fn(),
  createMission: jest.fn(),
  updateMission: jest.fn(),
  setMissionStatus: jest.fn(),
  deleteMission: jest.fn(),
};

// --- Mock Middleware & Dependencies ---
jest.mock('../../src/app/services/MissionsService', () => mockMissionsService);

jest.mock('../../src/app/middleware/auth.middleware', () => ({
  authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
    (req as any).user = { id: new Types.ObjectId().toHexString() };
    next();
  })
}));

jest.mock('../../src/app/middleware/permission.middleware', () => ({
  hasPermission: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next())
}));

// --- Setup Test App ---
const app = express();
app.use(express.json());
const missionsRouter = require('../../src/app/routes/missions/router').default;
app.use('/api/missions', missionsRouter);

// --- Test Helper ---
const createMockMission = (): Partial<IMissions> => ({
    _id: new Types.ObjectId(),
    document: 'mock_doc.pdf',
    student: new Types.ObjectId(),
    commissionedBy: new Types.ObjectId(),
    status: EMissionStatus.Active,
    remuneration: 100,
    dateCompleted: new Date()
});

describe('Missions Routes', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- GET /api/missions ---
  describe('GET /api/missions', () => {
    it('should return a list of missions and a 200 status code', async () => {
      const mockMissions = [createMockMission()];
      mockMissionsService.getMission.mockResolvedValue(mockMissions);

      const response = await request(app).get('/api/missions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.any(Array));
      expect(mockMissionsService.getMission).toHaveBeenCalledTimes(1);
    });
  });

  // --- GET /api/missions/:missionId ---
  describe('GET /api/missions/:missionId', () => {
    it('should return a single mission and a 200 status code', async () => {
        const missionId = new Types.ObjectId().toHexString();
        const mockMission = { ...createMockMission(), _id: missionId };
        mockMissionsService.getMissionById.mockResolvedValue(mockMission);

        const response = await request(app).get(`/api/missions/${missionId}`);

        expect(response.status).toBe(200);
        expect(response.body._id).toEqual(missionId);
        expect(mockMissionsService.getMissionById).toHaveBeenCalledWith(missionId);
    });
  });

  // --- POST /api/missions ---
  describe('POST /api/missions', () => {
    it('should create a mission and return 201', async () => {
      const missionData = {
        document: 'new_doc.pdf',
        studentId: new Types.ObjectId().toHexString(),
        remuneration: 150,
        dateCompleted: new Date().toISOString()
      };
      mockMissionsService.createMission.mockResolvedValue({ ...missionData, _id: new Types.ObjectId().toHexString() });

      const response = await request(app).post('/api/missions').send(missionData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(mockMissionsService.createMission).toHaveBeenCalled();
    });
  });

  // --- PATCH /api/missions/:missionId ---
  describe('PATCH /api/missions/:missionId', () => {
    it('should update a mission and return 200', async () => {
        const missionId = new Types.ObjectId().toHexString();
        const updateData = { remuneration: 500 };
        mockMissionsService.updateMission.mockResolvedValue({ ...createMockMission(), ...updateData });
        
        const response = await request(app).patch(`/api/missions/${missionId}`).send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.remuneration).toBe(500);
        expect(mockMissionsService.updateMission).toHaveBeenCalledWith(missionId, updateData);
    });
  });

  // --- DELETE /api/missions/:missionId ---
  describe('DELETE /api/missions/:missionId', () => {
    it('should delete a mission and return 204', async () => {
      const missionId = new Types.ObjectId().toHexString();
      mockMissionsService.deleteMission.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app).delete(`/api/missions/${missionId}`);
      
      expect(response.status).toBe(204);
      expect(mockMissionsService.deleteMission).toHaveBeenCalledWith(missionId);
    });
  });
});