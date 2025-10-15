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

        it('should return 404 if mission not found', async () => {
            (MissionsService.deleteMission as jest.Mock).mockResolvedValue({ deletedCount: 0 });
            const res = await request(app).delete(`/api/missions/${new Types.ObjectId()}`);
            expect(res.status).toBe(404);
            expect(res.text).toBe('Mission not found.');
        });

        it('should return 400 if mission ID is invalid', async () => {
            const res = await request(app).delete('/api/missions/invalid-id');
            expect(res.status).toBe(400);
            expect(res.text).toBe('Invalid mission ID format.');
        });
    });

    describe('GET /api/missions/student/:studentId', () => {
        it('should return missions for a specific student with 200 status', async () => {
            const studentId = new Types.ObjectId();
            (MissionsService.getMissionsByStudentId as jest.Mock).mockResolvedValue([mockMission]);
            const res = await request(app).get(`/api/missions/student/${studentId}`);
            expect(res.status).toBe(200);
            expect(res.body).toEqual([expect.any(Object)]);
            expect(MissionsService.getMissionsByStudentId).toHaveBeenCalledWith(studentId.toString());
        });

        it('should return 400 if student ID is invalid', async () => {
            const res = await request(app).get('/api/missions/student/invalid-id');
            expect(res.status).toBe(400);
            expect(res.text).toBe('Invalid student ID format.');
        });

        it('should handle errors when fetching student missions', async () => {
            const studentId = new Types.ObjectId();
            (MissionsService.getMissionsByStudentId as jest.Mock).mockRejectedValue(new Error('Database error'));
            const res = await request(app).get(`/api/missions/student/${studentId}`);
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('message', 'Error fetching student missions');
        });
    });

    describe('GET /api/missions/bundle/:bundleId', () => {
        it('should return missions for a specific bundle with 200 status', async () => {
            const bundleId = new Types.ObjectId();
            (MissionsService.getMissionsByBundleId as jest.Mock).mockResolvedValue([mockMission]);
            const res = await request(app).get(`/api/missions/bundle/${bundleId}`);
            expect(res.status).toBe(200);
            expect(res.body).toEqual([expect.any(Object)]);
            expect(MissionsService.getMissionsByBundleId).toHaveBeenCalledWith(bundleId.toString());
        });

        it('should return 400 if bundle ID is invalid', async () => {
            const res = await request(app).get('/api/missions/bundle/invalid-id');
            expect(res.status).toBe(400);
            expect(res.text).toBe('Invalid bundle ID format.');
        });

        it('should handle errors when fetching bundle missions', async () => {
            const bundleId = new Types.ObjectId();
            (MissionsService.getMissionsByBundleId as jest.Mock).mockRejectedValue(new Error('Database error'));
            const res = await request(app).get(`/api/missions/bundle/${bundleId}`);
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('message', 'Error fetching bundle missions');
        });
    });

    describe('GET /api/missions/find/bundle/:bundleId/tutor/:tutorId', () => {
        it('should find a mission by bundle and tutor with 200 status', async () => {
            const bundleId = new Types.ObjectId();
            const tutorId = new Types.ObjectId();
            (MissionsService.findMissionByBundleAndTutor as jest.Mock).mockResolvedValue(mockMission);
            const res = await request(app).get(`/api/missions/find/bundle/${bundleId}/tutor/${tutorId}`);
            expect(res.status).toBe(200);
            expect(res.body).toBeDefined();
            expect(MissionsService.findMissionByBundleAndTutor).toHaveBeenCalledWith(
                bundleId.toString(),
                tutorId.toString()
            );
        });

        it('should handle errors when finding mission by bundle and tutor', async () => {
            const bundleId = new Types.ObjectId();
            const tutorId = new Types.ObjectId();
            (MissionsService.findMissionByBundleAndTutor as jest.Mock).mockRejectedValue(new Error('Database error'));
            const res = await request(app).get(`/api/missions/find/bundle/${bundleId}/tutor/${tutorId}`);
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('message', 'Error finding mission');
        });
    });

    describe('GET /api/missions/:missionId', () => {
        it('should return a specific mission by ID with 200 status', async () => {
            const missionId = new Types.ObjectId();
            (MissionsService.getMissionById as jest.Mock).mockResolvedValue(mockMission);
            const res = await request(app).get(`/api/missions/${missionId}`);
            expect(res.status).toBe(200);
            expect(res.body).toBeDefined();
            expect(MissionsService.getMissionById).toHaveBeenCalledWith(missionId.toString());
        });

        it('should return 404 if mission not found', async () => {
            const missionId = new Types.ObjectId();
            (MissionsService.getMissionById as jest.Mock).mockResolvedValue(null);
            const res = await request(app).get(`/api/missions/${missionId}`);
            expect(res.status).toBe(404);
            expect(res.text).toBe('Mission not found.');
        });

        it('should return 400 if mission ID is invalid', async () => {
            const res = await request(app).get('/api/missions/invalid-id');
            expect(res.status).toBe(400);
            expect(res.text).toBe('Invalid mission ID format.');
        });

        it('should handle errors when fetching mission by ID', async () => {
            const missionId = new Types.ObjectId();
            (MissionsService.getMissionById as jest.Mock).mockRejectedValue(new Error('Database error'));
            const res = await request(app).get(`/api/missions/${missionId}`);
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('message', 'Error fetching mission');
        });
    });

    describe('PATCH /api/missions/:missionId/hours', () => {
        it('should update mission hours and return 200 status', async () => {
            const missionId = new Types.ObjectId();
            const updatedMission = { ...mockMission, hoursCompleted: 10 };
            (MissionsService.updateMissionHours as jest.Mock).mockResolvedValue(updatedMission);

            const res = await request(app)
                .patch(`/api/missions/${missionId}/hours`)
                .send({ hours: 10 });

            expect(res.status).toBe(200);
            expect(res.body).toBeDefined();
            expect(MissionsService.updateMissionHours).toHaveBeenCalledWith(missionId.toString(), 10);
        });

        it('should return 404 if mission not found when updating hours', async () => {
            const missionId = new Types.ObjectId();
            (MissionsService.updateMissionHours as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .patch(`/api/missions/${missionId}/hours`)
                .send({ hours: 5 });

            expect(res.status).toBe(404);
            expect(res.text).toBe('Mission not found.');
        });

        it('should handle errors when updating mission hours', async () => {
            const missionId = new Types.ObjectId();
            (MissionsService.updateMissionHours as jest.Mock).mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .patch(`/api/missions/${missionId}/hours`)
                .send({ hours: 5 });

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('message', 'Error updating mission hours');
        });
    });

    describe('PATCH /api/missions/:missionId', () => {
        it('should update a mission and return 200 status', async () => {
            const missionId = new Types.ObjectId();
            const updateData = { remuneration: 250 };
            const updatedMission = { ...mockMission, ...updateData };
            (MissionsService.updateMission as jest.Mock).mockResolvedValue(updatedMission);

            const res = await request(app)
                .patch(`/api/missions/${missionId}`)
                .send(updateData);

            expect(res.status).toBe(200);
            expect(res.body).toBeDefined();
            expect(MissionsService.updateMission).toHaveBeenCalledWith(missionId.toString(), updateData);
        });

        it('should return 404 if mission not found when updating', async () => {
            const missionId = new Types.ObjectId();
            (MissionsService.updateMission as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .patch(`/api/missions/${missionId}`)
                .send({ remuneration: 300 });

            expect(res.status).toBe(404);
            expect(res.text).toBe('Mission not found.');
        });

        it('should return 400 if mission ID is invalid when updating', async () => {
            const res = await request(app)
                .patch('/api/missions/invalid-id')
                .send({ remuneration: 300 });

            expect(res.status).toBe(400);
            expect(res.text).toBe('Invalid mission ID format.');
        });

        it('should handle errors when updating mission', async () => {
            const missionId = new Types.ObjectId();
            (MissionsService.updateMission as jest.Mock).mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .patch(`/api/missions/${missionId}`)
                .send({ remuneration: 300 });

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('message', 'Error updating mission');
        });
    });

    describe('PATCH /api/missions/:missionId/status', () => {
        it('should update mission status and return 200 status', async () => {
            const missionId = new Types.ObjectId();
            const updatedMission = { ...mockMission, status: EMissionStatus.Completed };
            (MissionsService.setMissionStatus as jest.Mock).mockResolvedValue(updatedMission);

            const res = await request(app)
                .patch(`/api/missions/${missionId}/status`)
                .send({ status: EMissionStatus.Completed });

            expect(res.status).toBe(200);
            expect(res.body).toBeDefined();
            expect(MissionsService.setMissionStatus).toHaveBeenCalledWith(
                missionId.toString(),
                EMissionStatus.Completed
            );
        });

        it('should return 400 if status field is missing', async () => {
            const missionId = new Types.ObjectId();

            const res = await request(app)
                .patch(`/api/missions/${missionId}/status`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.text).toBe("Field 'status' is required.");
        });

        it('should return 400 if status is invalid', async () => {
            const missionId = new Types.ObjectId();

            const res = await request(app)
                .patch(`/api/missions/${missionId}/status`)
                .send({ status: 'invalid-status' });

            expect(res.status).toBe(400);
            expect(res.text).toContain('Invalid status. Must be one of:');
        });

        it('should return 400 if mission ID is invalid when updating status', async () => {
            const res = await request(app)
                .patch('/api/missions/invalid-id/status')
                .send({ status: EMissionStatus.Completed });

            expect(res.status).toBe(400);
            expect(res.text).toBe('Invalid mission ID format.');
        });

        it('should return 404 if mission not found when updating status', async () => {
            const missionId = new Types.ObjectId();
            (MissionsService.setMissionStatus as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .patch(`/api/missions/${missionId}/status`)
                .send({ status: EMissionStatus.Completed });

            expect(res.status).toBe(404);
            expect(res.text).toBe('Mission not found.');
        });

        it('should handle errors when updating mission status', async () => {
            const missionId = new Types.ObjectId();
            (MissionsService.setMissionStatus as jest.Mock).mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .patch(`/api/missions/${missionId}/status`)
                .send({ status: EMissionStatus.Completed });

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('message', 'Error updating mission status');
        });
    });
});