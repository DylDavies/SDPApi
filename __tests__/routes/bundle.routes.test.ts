import { Request, Response, NextFunction } from 'express';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import IPayloadUser from '../../src/app/models/interfaces/IPayloadUser.interface';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { EBundleStatus } from '../../src/app/models/enums/EBundleStatus.enum';

// --- Mocking Services ---
const mockBundleService = {
    createBundle: jest.fn(),
    addSubjectToBundle: jest.fn(),
    removeSubjectFromBundle: jest.fn(),
    setBundleActiveStatus: jest.fn(),
    setBundleStatus: jest.fn(),
};

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// --- Mocking Singleton ---
jest.mock('../../src/app/models/classes/Singleton', () => ({
    Singleton: {
        getInstance: jest.fn().mockImplementation((serviceClass: any) => {
            if (serviceClass.name === 'BundleService') {
                return mockBundleService;
            }
            if (serviceClass.name === 'LoggingService') {
                return mockLogger;
            }
            return {};
        })
    }
}));


describe('Bundle Routes', () => {
    let bundleRouter: any;
    let mockRequest: Partial<Request & { user: IPayloadUser }>;
    let mockResponse: Partial<Response>;
    const nextFunction: NextFunction = jest.fn();
    const mockUser: IPayloadUser = { // A mock user to be attached to requests
        id: 'user-abc-123',
        email: 'test@tutor.com',
        displayName: 'Test User',
        firstLogin: false,
        permissions: [EPermission.BUNDLES_CREATE, EPermission.BUNDLES_EDIT],
        type: EUserType.Admin,
    };

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        bundleRouter = require('../../src/app/routes/bundle/router').default;

        mockRequest = {
            headers: {},
            user: mockUser,
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
    });

    // A helper to safely find the route handler
    const findHandler = (path: string, method: 'post' | 'patch' | 'delete') => {
        const layer = bundleRouter.stack.find((l: any) => 
            l.route && l.route.path === path && l.route.methods[method]
        );
        if (!layer) {
            throw new Error(`Could not find handler for ${method.toUpperCase()} ${path}`);
        }
        // The first handler is hasPermission, the second is our async function
        return layer.route.stack[1].handle; 
    };

    // --- Test Suite for POST /api/bundle ---
    describe('POST /', () => {
        const bundleData = {
            student: 'student-id-456',
            subjects: [{ subject: 'Math', tutor: 'tutor-id-789', hours: 10 }],
        };

        it('should create a bundle and return 201', async () => {
            mockRequest.body = bundleData;
            mockBundleService.createBundle.mockResolvedValue({ ...bundleData, _id: 'new-bundle-id' });

            const handler = findHandler('/', 'post');
            await handler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockBundleService.createBundle).toHaveBeenCalledWith(bundleData.student, bundleData.subjects, mockUser.id);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'new-bundle-id' }));
        });

        it('should return 400 if student is missing', async () => {
            mockRequest.body = { subjects: bundleData.subjects }; // Missing student
            
            const handler = findHandler('/', 'post');
            await handler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.send).toHaveBeenCalledWith('Missing required fields: student, subjects');
        });
    });

    // --- Test Suite for POST /api/bundle/:bundleId/subjects ---
    describe('POST /:bundleId/subjects', () => {
        const subjectData = { subject: 'Science', tutor: 'tutor-id-123', hours: 5 };

        it('should add a subject and return 200', async () => {
            mockRequest.params = { bundleId: 'bundle-xyz' };
            mockRequest.body = subjectData;
            mockBundleService.addSubjectToBundle.mockResolvedValue({ _id: 'bundle-xyz', subjects: [subjectData] });

            const handler = findHandler('/:bundleId/subjects', 'post');
            await handler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockBundleService.addSubjectToBundle).toHaveBeenCalledWith('bundle-xyz', subjectData);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ subjects: [subjectData] }));
        });

        it('should return 404 if bundle is not found', async () => {
            mockRequest.params = { bundleId: 'non-existent-bundle' };
            mockRequest.body = subjectData;
            mockBundleService.addSubjectToBundle.mockResolvedValue(null); // Simulate not found

            const handler = findHandler('/:bundleId/subjects', 'post');
            await handler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.send).toHaveBeenCalledWith('Bundle not found.');
        });
    });
    
    // --- Test Suite for PATCH /api/bundle/:bundleId/status ---
    describe('PATCH /:bundleId/status', () => {
        it('should update bundle status and return 200', async () => {
            mockRequest.params = { bundleId: 'bundle-xyz' };
            mockRequest.body = { status: EBundleStatus.Approved };
            mockBundleService.setBundleStatus.mockResolvedValue({ _id: 'bundle-xyz', status: EBundleStatus.Approved });

            const handler = findHandler('/:bundleId/status', 'patch');
            await handler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockBundleService.setBundleStatus).toHaveBeenCalledWith('bundle-xyz', EBundleStatus.Approved);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ status: EBundleStatus.Approved }));
        });

        it('should return 400 for an invalid status', async () => {
            mockRequest.params = { bundleId: 'bundle-xyz' };
            mockRequest.body = { status: 'invalid-status' }; // Invalid status

            const handler = findHandler('/:bundleId/status', 'patch');
            await handler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('Invalid status'));
        });
    });
});