import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { EBundleStatus } from '../../src/app/models/enums/EBundleStatus.enum';
import { Types } from 'mongoose';

// --- Mock Services ---
const mockBundleService = {
    createBundle: jest.fn(),
    addSubjectToBundle: jest.fn(),
    removeSubjectFromBundle: jest.fn(),
    setBundleActiveStatus: jest.fn(),
    setBundleStatus: jest.fn(),
    getBundles: jest.fn(),
    getBundleById: jest.fn(),
    updateBundle: jest.fn(),
};

jest.mock('../../src/app/models/classes/Singleton', () => ({
    Singleton: {
        getInstance: jest.fn().mockImplementation((serviceClass: any) => {
            if (serviceClass.name === 'BundleService') {
                return mockBundleService;
            }
            return {};
        })
    }
}));

// --- Mock Middleware ---
jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        // Attach a mock user to the request for the handler to use
        (req as any).user = {
            id: new Types.ObjectId().toHexString(), // Use a valid ObjectId string for the user
            email: 'test@tutor.com',
            displayName: 'Test User',
            firstLogin: false,
            permissions: [EPermission.BUNDLES_CREATE, EPermission.BUNDLES_EDIT, EPermission.BUNDLES_VIEW], // Added BUNDLES_VIEW
            type: EUserType.Admin,
        };
        next();
    })
}));

jest.mock('../../src/app/middleware/permission.middleware', () => ({
    hasPermission: jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
        // For these tests, we assume the user always has permission.
        next(); 
    })
}));

// --- Setup Test App ---
const app = express();
app.use(express.json());

const bundleRouter = require('../../src/app/routes/bundle/router').default;
app.use('/api/bundle', bundleRouter);


describe('Bundle Routes', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- Test Suite for GET /api/bundle ---
    describe('GET /api/bundle', () => {
        it('should return a list of bundles and a 200 status code', async () => {
            const mockBundles = [
                { _id: new Types.ObjectId().toHexString(), student: new Types.ObjectId().toHexString(), subjects: [] },
                { _id: new Types.ObjectId().toHexString(), student: new Types.ObjectId().toHexString(), subjects: [] }
            ];
            mockBundleService.getBundles.mockResolvedValue(mockBundles);

            const response = await request(app).get('/api/bundle');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockBundles);
            expect(mockBundleService.getBundles).toHaveBeenCalledTimes(1);
        });
    });

    // --- Test Suite for POST /api/bundle ---
    describe('POST /api/bundle', () => {
        const bundleData = {
            // Use valid ObjectId strings for IDs
            student: new Types.ObjectId().toHexString(),
            subjects: [{ subject: 'Math', tutor: new Types.ObjectId().toHexString(), durationMinutes: 600 }],
        };

        it('should create a bundle and return 201', async () => {
            mockBundleService.createBundle.mockResolvedValue({ ...bundleData, _id: 'new-bundle-id' });

            const response = await request(app)
                .post('/api/bundle')
                .send(bundleData);

            expect(response.status).toBe(201);
            expect(response.body).toEqual(expect.objectContaining({ _id: 'new-bundle-id' }));
            // We get the creator ID from the mocked middleware
            expect(mockBundleService.createBundle).toHaveBeenCalledWith(bundleData.student, bundleData.subjects, expect.any(String));
        });

        it('should return 400 if student is missing', async () => {
            // eslint-disable-next-line
            const { student, ...incompleteData } = bundleData;

            const response = await request(app)
                .post('/api/bundle')
                .send(incompleteData);

            expect(response.status).toBe(400);
            expect(response.text).toBe('Missing required fields: student, subjects');
        });
    });

    // --- Test Suite for POST /api/bundle/:bundleId/subjects ---
    describe('POST /api/bundle/:bundleId/subjects', () => {
        // Use valid ObjectId strings for IDs
        const subjectData = { subject: 'Science', tutor: new Types.ObjectId().toHexString(), durationMinutes: 300 };
        const bundleId = new Types.ObjectId().toHexString();

        it('should add a subject and return 200', async () => {
            mockBundleService.addSubjectToBundle.mockResolvedValue({ _id: bundleId, subjects: [subjectData] });

            const response = await request(app)
                .post(`/api/bundle/${bundleId}/subjects`)
                .send(subjectData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(expect.objectContaining({ subjects: [subjectData] }));
            expect(mockBundleService.addSubjectToBundle).toHaveBeenCalledWith(bundleId, subjectData);
        });

        it('should return 404 if bundle is not found', async () => {
            mockBundleService.addSubjectToBundle.mockResolvedValue(null);

            const response = await request(app)
                .post(`/api/bundle/${new Types.ObjectId().toHexString()}/subjects`)
                .send(subjectData);

            expect(response.status).toBe(404);
            expect(response.text).toBe('Bundle not found.');
        });
    });
    
    // --- Test Suite for PATCH /api/bundle/:bundleId/status ---
    describe('PATCH /api/bundle/:bundleId/status', () => {
        const bundleId = new Types.ObjectId().toHexString();

        it('should update bundle status and return 200', async () => {
            mockBundleService.setBundleStatus.mockResolvedValue({ _id: bundleId, status: EBundleStatus.Approved });

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status`)
                .send({ status: EBundleStatus.Approved });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(expect.objectContaining({ status: EBundleStatus.Approved }));
            expect(mockBundleService.setBundleStatus).toHaveBeenCalledWith(bundleId, EBundleStatus.Approved);
        });

        it('should return 400 for an invalid status', async () => {
            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status`)
                .send({ status: 'invalid-status' });

            expect(response.status).toBe(400);
            expect(response.text).toContain('Invalid status');
        });

        it('should return 400 when status is missing', async () => {
            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.text).toContain('Field \'status\' is required');
        });

        it('should return 400 for invalid bundle ID format', async () => {
            const response = await request(app)
                .patch('/api/bundle/invalid-id/status')
                .send({ status: EBundleStatus.Approved });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Invalid bundle ID format.');
        });

        it('should return 404 when bundle not found', async () => {
            mockBundleService.setBundleStatus.mockResolvedValue(null);

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status`)
                .send({ status: EBundleStatus.Approved });

            expect(response.status).toBe(404);
            expect(response.text).toBe('Bundle not found.');
        });

        it('should return 500 on service error', async () => {
            mockBundleService.setBundleStatus.mockRejectedValue(new Error('DB Error'));

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status`)
                .send({ status: EBundleStatus.Approved });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error updating bundle status');
        });
    });

    // --- Test Suite for GET /api/bundle (Error cases) ---
    describe('GET /api/bundle - Error cases', () => {
        it('should return 500 on service error', async () => {
            mockBundleService.getBundles.mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/api/bundle');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error fetching bundles');
        });
    });

    // --- Test Suite for GET /api/bundle/:bundleId ---
    describe('GET /api/bundle/:bundleId', () => {
        const bundleId = new Types.ObjectId().toHexString();

        it('should return a single bundle by ID', async () => {
            const mockBundle = { _id: bundleId, student: new Types.ObjectId().toHexString(), subjects: [] };
            mockBundleService.getBundleById.mockResolvedValue(mockBundle);

            const response = await request(app).get(`/api/bundle/${bundleId}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockBundle);
            expect(mockBundleService.getBundleById).toHaveBeenCalledWith(bundleId);
        });

        it('should return 400 for invalid bundle ID format', async () => {
            const response = await request(app).get('/api/bundle/invalid-id');

            expect(response.status).toBe(400);
            expect(response.text).toBe('Invalid bundle ID format.');
        });

        it('should return 404 when bundle not found', async () => {
            mockBundleService.getBundleById.mockResolvedValue(null);

            const response = await request(app).get(`/api/bundle/${bundleId}`);

            expect(response.status).toBe(404);
            expect(response.text).toBe('Bundle not found.');
        });

        it('should return 500 on service error', async () => {
            mockBundleService.getBundleById.mockRejectedValue(new Error('DB Error'));

            const response = await request(app).get(`/api/bundle/${bundleId}`);

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error fetching bundle');
        });
    });

    // --- Test Suite for POST /api/bundle (Additional error cases) ---
    describe('POST /api/bundle - Additional error cases', () => {
        it('should return 400 if subjects is not an array', async () => {
            const invalidData = {
                student: new Types.ObjectId().toHexString(),
                subjects: 'not-an-array'
            };

            const response = await request(app)
                .post('/api/bundle')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.text).toBe('Missing required fields: student, subjects');
        });

        it('should return 400 for invalid student ID format', async () => {
            const invalidData = {
                student: 'invalid-id',
                subjects: [{ subject: 'Math', tutor: new Types.ObjectId().toHexString(), durationMinutes: 600 }]
            };

            const response = await request(app)
                .post('/api/bundle')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.text).toBe('Invalid student ID format.');
        });

        it('should return 500 on service error', async () => {
            const bundleData = {
                student: new Types.ObjectId().toHexString(),
                subjects: [{ subject: 'Math', tutor: new Types.ObjectId().toHexString(), durationMinutes: 600 }]
            };
            mockBundleService.createBundle.mockRejectedValue(new Error('DB Error'));

            const response = await request(app)
                .post('/api/bundle')
                .send(bundleData);

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error creating bundle');
        });
    });

    // --- Test Suite for PATCH /api/bundle/:bundleId ---
    describe('PATCH /api/bundle/:bundleId', () => {
        const bundleId = new Types.ObjectId().toHexString();

        it('should update a bundle successfully', async () => {
            const updateData = { student: new Types.ObjectId().toHexString() };
            const updatedBundle = { _id: bundleId, ...updateData };
            mockBundleService.updateBundle.mockResolvedValue(updatedBundle);

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedBundle);
            expect(mockBundleService.updateBundle).toHaveBeenCalledWith(bundleId, updateData);
        });

        it('should return 400 for invalid bundle ID format', async () => {
            const response = await request(app)
                .patch('/api/bundle/invalid-id')
                .send({});

            expect(response.status).toBe(400);
            expect(response.text).toBe('Invalid bundle ID format.');
        });

        it('should return 404 when bundle not found', async () => {
            mockBundleService.updateBundle.mockResolvedValue(null);

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}`)
                .send({});

            expect(response.status).toBe(404);
            expect(response.text).toBe('Bundle not found.');
        });

        it('should return 500 on service error', async () => {
            mockBundleService.updateBundle.mockRejectedValue(new Error('DB Error'));

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}`)
                .send({});

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error updating bundle');
        });
    });

    // --- Test Suite for POST /api/bundle/:bundleId/subjects (Additional error cases) ---
    describe('POST /api/bundle/:bundleId/subjects - Additional error cases', () => {
        const bundleId = new Types.ObjectId().toHexString();

        it('should return 400 for missing subject field', async () => {
            const invalidData = { tutor: new Types.ObjectId().toHexString(), durationMinutes: 300 };

            const response = await request(app)
                .post(`/api/bundle/${bundleId}/subjects`)
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.text).toBe('Missing required fields for subject: subject, tutor, durationMinutes');
        });

        it('should return 400 for invalid bundle ID format', async () => {
            const subjectData = { subject: 'Science', tutor: new Types.ObjectId().toHexString(), durationMinutes: 300 };

            const response = await request(app)
                .post('/api/bundle/invalid-id/subjects')
                .send(subjectData);

            expect(response.status).toBe(400);
            expect(response.text).toBe('Invalid bundle ID format.');
        });

        it('should return 400 for invalid tutor ID format', async () => {
            const subjectData = { subject: 'Science', tutor: 'invalid-id', durationMinutes: 300 };

            const response = await request(app)
                .post(`/api/bundle/${bundleId}/subjects`)
                .send(subjectData);

            expect(response.status).toBe(400);
            expect(response.text).toBe('Invalid tutor ID format.');
        });

        it('should return 400 for invalid durationMinutes (non-number)', async () => {
            const subjectData = { subject: 'Science', tutor: new Types.ObjectId().toHexString(), durationMinutes: 'invalid' };

            const response = await request(app)
                .post(`/api/bundle/${bundleId}/subjects`)
                .send(subjectData);

            expect(response.status).toBe(400);
            expect(response.text).toBe('durationMinutes must be a positive number.');
        });

        it('should return 400 for negative durationMinutes', async () => {
            const subjectData = { subject: 'Science', tutor: new Types.ObjectId().toHexString(), durationMinutes: -10 };

            const response = await request(app)
                .post(`/api/bundle/${bundleId}/subjects`)
                .send(subjectData);

            expect(response.status).toBe(400);
            expect(response.text).toBe('durationMinutes must be a positive number.');
        });

        it('should return 500 on service error', async () => {
            const subjectData = { subject: 'Science', tutor: new Types.ObjectId().toHexString(), durationMinutes: 300 };
            mockBundleService.addSubjectToBundle.mockRejectedValue(new Error('DB Error'));

            const response = await request(app)
                .post(`/api/bundle/${bundleId}/subjects`)
                .send(subjectData);

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error adding subject to bundle');
        });
    });

    // --- Test Suite for DELETE /api/bundle/:bundleId/subjects/:subjectName ---
    describe('DELETE /api/bundle/:bundleId/subjects/:subjectName', () => {
        const bundleId = new Types.ObjectId().toHexString();

        it('should remove a subject from bundle successfully', async () => {
            const updatedBundle = { _id: bundleId, subjects: [] };
            mockBundleService.removeSubjectFromBundle.mockResolvedValue(updatedBundle);

            const response = await request(app)
                .delete(`/api/bundle/${bundleId}/subjects/Math`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedBundle);
            expect(mockBundleService.removeSubjectFromBundle).toHaveBeenCalledWith(bundleId, 'Math');
        });

        it('should return 400 for invalid bundle ID format', async () => {
            const response = await request(app)
                .delete('/api/bundle/invalid-id/subjects/Math');

            expect(response.status).toBe(400);
            expect(response.text).toBe('Invalid bundle ID format provided.');
        });

        it('should return 404 when bundle not found', async () => {
            mockBundleService.removeSubjectFromBundle.mockResolvedValue(null);

            const response = await request(app)
                .delete(`/api/bundle/${bundleId}/subjects/Math`);

            expect(response.status).toBe(404);
            expect(response.text).toBe('Bundle not found.');
        });

        it('should return 404 on service error', async () => {
            mockBundleService.removeSubjectFromBundle.mockRejectedValue(new Error('Subject not found'));

            const response = await request(app)
                .delete(`/api/bundle/${bundleId}/subjects/Math`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Error removing subject');
        });

        it('should return 500 on unexpected error', async () => {
            mockBundleService.removeSubjectFromBundle.mockRejectedValue('Non-error object');

            const response = await request(app)
                .delete(`/api/bundle/${bundleId}/subjects/Math`);

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('An unexpected error occurred.');
        });
    });

    // --- Test Suite for PATCH /api/bundle/:bundleId/status/active ---
    describe('PATCH /api/bundle/:bundleId/status/active', () => {
        const bundleId = new Types.ObjectId().toHexString();

        it('should set bundle active status to true', async () => {
            const updatedBundle = { _id: bundleId, isActive: true };
            mockBundleService.setBundleActiveStatus.mockResolvedValue(updatedBundle);

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status/active`)
                .send({ isActive: true });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedBundle);
            expect(mockBundleService.setBundleActiveStatus).toHaveBeenCalledWith(bundleId, true);
        });

        it('should set bundle active status to false', async () => {
            const updatedBundle = { _id: bundleId, isActive: false };
            mockBundleService.setBundleActiveStatus.mockResolvedValue(updatedBundle);

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status/active`)
                .send({ isActive: false });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedBundle);
            expect(mockBundleService.setBundleActiveStatus).toHaveBeenCalledWith(bundleId, false);
        });

        it('should return 400 when isActive is not a boolean', async () => {
            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status/active`)
                .send({ isActive: 'true' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Field \'isActive\' must be a boolean.');
        });

        it('should return 400 for invalid bundle ID format', async () => {
            const response = await request(app)
                .patch('/api/bundle/invalid-id/status/active')
                .send({ isActive: true });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Invalid bundle ID format.');
        });

        it('should return 404 when bundle not found', async () => {
            mockBundleService.setBundleActiveStatus.mockResolvedValue(null);

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status/active`)
                .send({ isActive: true });

            expect(response.status).toBe(404);
            expect(response.text).toBe('Bundle not found.');
        });

        it('should return 500 on service error', async () => {
            mockBundleService.setBundleActiveStatus.mockRejectedValue(new Error('DB Error'));

            const response = await request(app)
                .patch(`/api/bundle/${bundleId}/status/active`)
                .send({ isActive: true });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error updating bundle active status');
        });
    });
});