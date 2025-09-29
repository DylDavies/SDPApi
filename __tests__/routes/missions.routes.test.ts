// __tests__/routes/missions.routes.test.ts

import request from 'supertest';
import express from 'express';
import missionsRouter from '../../src/app/routes/missions/router';
import MissionsService from "../../src/app/services/MissionsService";
import { Types } from 'mongoose';
import { EMissionStatus } from '../../src/app/models/enums/EMissions.enum';
import { IMissions } from "../../src/app/db/models/MMissions.model";

// Mock the services and middleware
jest.mock('../../src/app/services/MissionsService');
jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: (req: any, res: any, next: () => void) => {
        req.user = { id: 'commissioner123' };
        next();
    },
}));
jest.mock('../../src/app/middleware/permission.middleware', () => ({
    hasPermission: () => (req: any, res: any, next: () => void) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/missions', missionsRouter);

const mockMission: Partial<IMissions> = {
    _id: new Types.ObjectId(),
    bundleId: new Types.ObjectId(),
    document: new Types.ObjectId(),
    student: new Types.ObjectId(),
    tutor: new Types.ObjectId(),
    remuneration: 150,
    commissionedBy: new Types.ObjectId(),
    dateCompleted: new Date(),
    status: EMissionStatus.Active,
};

describe('Missions Router', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ... (other passing tests remain the same)
    describe('GET /api/missions', () => {
        it('should return all missions with a 200 status', async () => {
            (MissionsService.getMission as jest.Mock).mockResolvedValue([mockMission]);
            const res = await request(app).get('/api/missions');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([expect.any(Object)]);
        });
    });

    describe('POST /api/missions', () => {
        it('should create a mission and return 201 status', async () => {
            (MissionsService.createMission as jest.Mock).mockResolvedValue(mockMission);
            const missionData = {
                bundleId: new Types.ObjectId().toHexString(),
                documentId: new Types.ObjectId().toHexString(),
                studentId: new Types.ObjectId().toHexString(),
                tutorId: new Types.ObjectId().toHexString(),
                remuneration: 200,
                dateCompleted: new Date().toISOString(),
            };

            const res = await request(app)
                .post('/api/missions')
                .send(missionData); // Send as JSON body

            expect(res.status).toBe(201);
            expect(res.body).toBeDefined();
            expect(MissionsService.createMission).toHaveBeenCalled();
        });

        it('should return 400 if required fields are missing', async () => {
            const missionData = {
                studentId: new Types.ObjectId().toHexString(),
                // Missing other fields
            };
            
            const res = await request(app)
                .post('/api/missions')
                .send(missionData); // Send incomplete JSON body

            expect(res.status).toBe(400);
            expect(res.text).toBe('Missing required fields');
        });
    });

    // ... (other passing tests remain the same)
    describe('DELETE /api/missions/:missionId', () => {
        it('should delete a mission and return 204 status', async () => {
            (MissionsService.deleteMission as jest.Mock).mockResolvedValue({ deletedCount: 1 });
            const res = await request(app).delete(`/api/missions/${mockMission._id}`);
            expect(res.status).toBe(204);
        });
    });
});