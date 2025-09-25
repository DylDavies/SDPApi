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
    getBundles: jest.fn(), // Added mock for getBundles
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
    });
});