import request from 'supertest';
import express from 'express';
import missionsRouter from '../../src/app/routes/missions/router';
import MissionsService from "../../src/app/services/MissionsService";
import { Types } from 'mongoose';
import path from 'path';
import fs from 'fs';
import { IMissions } from "../../src/app/models/interfaces/IMissions.interface";
import { EMissionStatus }from '../../src/app/models/enums/EMissions.enum';

// Mock the services and middleware
jest.mock('../../src/app/services/MissionsService');
jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: (req: any, res: any, next: () => void) => next(),
}));
jest.mock('../../src/app/middleware/permission.middleware', () => ({
    hasPermission: () => (req: any, res: any, next: () => void) => next(),
}));

const app = express();
app.use(express.json());
// Add a mock user to the request for the POST endpoint
app.use((req: any, res, next) => {
    req.user = { id: 'commissioner123' };
    next();
});
app.use('/api/missions', missionsRouter);

const mockMission = {
    _id: new Types.ObjectId(),
    bundleId: new Types.ObjectId(),
    documentPath: 'uploads/missions/document-123.pdf',
    documentName: 'mission.pdf',
    student: new Types.ObjectId(),
    tutor: new Types.ObjectId(),
    remuneration: 150,
    commissionedBy: new Types.ObjectId(),
    hoursCompleted: 0,
    dateCompleted: new Date(),
    status: EMissionStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
} as unknown as IMissions;


describe('Missions Router', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/missions', () => {
        it('should return all missions with a 200 status', async () => {
            (MissionsService.getMission as jest.Mock).mockResolvedValue([mockMission]);

            const res = await request(app).get('/api/missions');

            expect(res.status).toBe(200);
            expect(res.body).toEqual([expect.any(Object)]);
            expect(MissionsService.getMission).toHaveBeenCalled();
        });

        it('should return 500 on service error', async () => {
            (MissionsService.getMission as jest.Mock).mockRejectedValue(new Error('Database error'));

            const res = await request(app).get('/api/missions');

            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Error fetching missions');
        });
    });

    describe('GET /api/missions/:missionId', () => {
        it('should return a single mission with a 200 status', async () => {
            (MissionsService.getMissionById as jest.Mock).mockResolvedValue(mockMission);

            const res = await request(app).get(`/api/missions/${mockMission._id}`);

            expect(res.status).toBe(200);
            expect(res.body).toBeDefined();
            expect(MissionsService.getMissionById).toHaveBeenCalledWith(mockMission._id.toString());
        });

        it('should return 404 if mission not found', async () => {
            (MissionsService.getMissionById as jest.Mock).mockResolvedValue(null);
            const nonExistentId = new Types.ObjectId();

            const res = await request(app).get(`/api/missions/${nonExistentId}`);

            expect(res.status).toBe(404);
            expect(res.text).toBe('Mission not found.');
        });

        it('should return 400 for an invalid mission ID', async () => {
            const res = await request(app).get('/api/missions/invalid-id');
            expect(res.status).toBe(400);
            expect(res.text).toBe('Invalid mission ID format.');
        });
    });

    describe('POST /api/missions', () => {
        const testPdfPath = path.join(__dirname, 'test.pdf');

        beforeAll(() => {
            // Create a dummy PDF file for testing uploads
            fs.writeFileSync(testPdfPath, 'dummy pdf content');
        });

        afterAll(() => {
            // Clean up the dummy file
            fs.unlinkSync(testPdfPath);
            // Clean up uploaded files
             const uploadDir = 'uploads/missions';
             if (fs.existsSync(uploadDir)) {
                 fs.readdirSync(uploadDir).forEach((file) => {
                     fs.unlinkSync(path.join(uploadDir, file));
                 });
             }
        });

        it('should create a mission and return 201 status', async () => {
            (MissionsService.createMission as jest.Mock).mockResolvedValue(mockMission);

            const res = await request(app)
                .post('/api/missions')
                .field('bundleId', '60c72b2f9b1d8e001f8e8b8a')
                .field('studentId', '60c72b2f9b1d8e001f8e8b8b')
                .field('tutorId', '60c72b2f9b1d8e001f8e8b8c')
                .field('remuneration', '200')
                .field('dateCompleted', new Date().toISOString())
                .attach('document', testPdfPath);

            expect(res.status).toBe(201);
            expect(res.body).toBeDefined();
            expect(MissionsService.createMission).toHaveBeenCalled();
        });

        it('should return 400 if no file is uploaded', async () => {
            const res = await request(app)
                .post('/api/missions')
                .field('studentId', '60c72b2f9b1d8e001f8e8b8b');
            
            expect(res.status).toBe(400);
            expect(res.text).toBe('No file uploaded.');
        });
        
        it('should return 400 if required fields are missing', async () => {
            const res = await request(app)
                .post('/api/missions')
                .field('studentId', '60c72b2f9b1d8e001f8e8b8b')
                .attach('document', testPdfPath);

            expect(res.status).toBe(400);
            expect(res.text).toBe('Missing required fields');
        });
    });

    describe('PATCH /api/missions/:missionId', () => {
        it('should update a mission and return 200 status', async () => {
            const updateData = { remuneration: 500 };
            const updatedMission = { ...mockMission, ...updateData };
            (MissionsService.updateMission as jest.Mock).mockResolvedValue(updatedMission);

            const res = await request(app)
                .patch(`/api/missions/${mockMission._id}`)
                .send(updateData);

            expect(res.status).toBe(200);
            expect(res.body.remuneration).toBe(500);
            expect(MissionsService.updateMission).toHaveBeenCalledWith(mockMission._id.toString(), updateData);
        });

        it('should return 404 if mission to update is not found', async () => {
            (MissionsService.updateMission as jest.Mock).mockResolvedValue(null);
            const nonExistentId = new Types.ObjectId();

            const res = await request(app)
                .patch(`/api/missions/${nonExistentId}`)
                .send({ remuneration: 500 });

            expect(res.status).toBe(404);
            expect(res.text).toBe('Mission not found.');
        });

        it('should return 400 for an invalid mission ID', async () => {
            const res = await request(app)
                .patch('/api/missions/invalid-id')
                .send({ remuneration: 500 });

            expect(res.status).toBe(400);
            expect(res.text).toBe('Invalid mission ID format.');
        });
    });

    describe('PATCH /api/missions/:missionId/status', () => {
        it('should update mission status and return 200 status', async () => {
            const newStatus = EMissionStatus.Completed;
            const updatedMission = { ...mockMission, status: newStatus };
            (MissionsService.setMissionStatus as jest.Mock).mockResolvedValue(updatedMission);

            const res = await request(app)
                .patch(`/api/missions/${mockMission._id}/status`)
                .send({ status: newStatus });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe(newStatus);
            expect(MissionsService.setMissionStatus).toHaveBeenCalledWith(mockMission._id.toString(), newStatus);
        });
        
        it('should return 400 for an invalid status value', async () => {
             const res = await request(app)
                .patch(`/api/missions/${mockMission._id}/status`)
                .send({ status: 'invalid-status' });
            
            expect(res.status).toBe(400);
            expect(res.text).toContain('Invalid status');
        });

        it('should return 404 if mission to update status is not found', async () => {
            (MissionsService.setMissionStatus as jest.Mock).mockResolvedValue(null);
            const nonExistentId = new Types.ObjectId();

            const res = await request(app)
                .patch(`/api/missions/${nonExistentId}/status`)
                .send({ status: EMissionStatus.Completed });

            expect(res.status).toBe(404);
            expect(res.text).toBe('Mission not found.');
        });
    });
    
    describe('DELETE /api/missions/:missionId', () => {
        it('should delete a mission and return 204 status', async () => {
            (MissionsService.deleteMission as jest.Mock).mockResolvedValue({ deletedCount: 1 });

            const res = await request(app).delete(`/api/missions/${mockMission._id}`);

            expect(res.status).toBe(204);
            expect(MissionsService.deleteMission).toHaveBeenCalledWith(mockMission._id.toString());
        });

        it('should return 404 if mission to delete is not found', async () => {
            (MissionsService.deleteMission as jest.Mock).mockResolvedValue({ deletedCount: 0 });
            const nonExistentId = new Types.ObjectId();

            const res = await request(app).delete(`/api/missions/${nonExistentId}`);
            
            expect(res.status).toBe(404);
            expect(res.text).toBe('Mission not found.');
        });
    });

    describe('GET /api/missions/document/:filename', () => {
        // FIX: Define the upload directory inside `src` to match the router's logic
        const uploadDir = path.resolve(process.cwd(), 'src/app/routes/missions/uploads/missions');
        const testFilename = 'test-download.pdf';
        const testFilePath = path.join(uploadDir, testFilename);

        beforeAll(() => {
            fs.mkdirSync(uploadDir, { recursive: true });
            fs.writeFileSync(testFilePath, 'file content');
        });

        /*afterAll(() => {
            fs.unlinkSync(testFilePath);
            // Attempt to remove the directory, ignore errors if it fails (e.g., not empty)
            try { fs.rmdirSync(uploadDir, { recursive: true }); } catch (e) {}
        });*/

        it('should return 404 if file does not exist', async () => {
            const res = await request(app).get('/api/missions/document/non-existent-file.pdf');
            expect(res.status).toBe(404);
            expect(res.text).toBe('File not found.');
        });
    });
});