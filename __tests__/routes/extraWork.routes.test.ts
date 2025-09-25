import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { EExtraWorkStatus } from '../../src/app/db/models/MExtraWork.model';
import IPayloadUser from '../../src/app/models/interfaces/IPayloadUser.interface';
import { JwtPayload } from 'jsonwebtoken';

// --- Type Declaration to solve TypeScript error ---
// This tells TypeScript that our Express Request object can have a 'user' property.
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: IPayloadUser | JwtPayload;
        }
    }
}

// --- Mock Services ---
const mockExtraWorkService = {
    getExtraWork: jest.fn(),
    getExtraWorkForUser: jest.fn(),
    createExtraWork: jest.fn(),
    completeExtraWork: jest.fn(),
    setExtraWorkStatus: jest.fn(),
};

const mockUserService = {
    getUser: jest.fn(),
};

jest.mock('../../src/app/models/classes/Singleton', () => ({
    Singleton: {
        getInstance: jest.fn().mockImplementation((serviceClass: any) => {
            if (serviceClass.name === 'ExtraWorkService') {
                return mockExtraWorkService;
            }
            if (serviceClass.name === 'UserService') {
                return mockUserService;
            }
            // Return an empty object for other services if they are not needed
            return {};
        })
    }
}));

// --- Mock Middleware ---
jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        // The mock user is attached by our custom test middleware
        next();
    }),
    attachUserMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
}));

jest.mock('../../src/app/middleware/permission.middleware', () => ({
    hasPermission: jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
        // Assume the user always has permission for route-level tests
        next();
    })
}));

// --- Test App Setup ---
const app = express();
app.use(express.json());
// Dynamically require the router after mocks have been set up
const extraWorkRouter = require('../../src/app/routes/extrawork/router').default;

// --- Mock User Data ---
const adminUser: IPayloadUser = {
    id: new Types.ObjectId().toHexString(),
    email: 'admin@tutor.com',
    displayName: 'Admin User',
    firstLogin: false,
    permissions: Object.values(EPermission),
    type: EUserType.Admin,
};

const regularUser: IPayloadUser = {
    id: new Types.ObjectId().toHexString(),
    email: 'user@tutor.com',
    displayName: 'Regular User',
    firstLogin: false,
    permissions: [EPermission.EXTRA_WORK_VIEW, EPermission.EXTRA_WORK_CREATE, EPermission.EXTRA_WORK_EDIT],
    type: EUserType.Staff,
};

// Middleware to attach the correct mock user based on a header sent from the test
app.use('/api/extrawork', (req, res, next) => {
    const userType = req.headers['x-mock-user-type'] as string;
    if (userType === 'admin') {
        req.user = adminUser;
    } else if (userType === 'regular') {
        req.user = regularUser;
    }
    next();
}, extraWorkRouter);


describe('Extra Work Routes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- Test Suite for GET /api/extrawork ---
    describe('GET /api/extrawork', () => {
        it('should fetch all work for an admin user', async () => {
            mockUserService.getUser.mockResolvedValue({ ...adminUser, permissions: new Set(adminUser.permissions) });
            mockExtraWorkService.getExtraWork.mockResolvedValue([{ _id: 'work1' }, { _id: 'work2' }]);
            
            const response = await request(app)
                .get('/api/extrawork')
                .set('Accept', 'application/json')
                .set('x-mock-user-type', 'admin'); // Set header to specify the user

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(mockExtraWorkService.getExtraWork).toHaveBeenCalled();
            expect(mockExtraWorkService.getExtraWorkForUser).not.toHaveBeenCalled();
        });

        it('should fetch only specific user work for a non-admin user', async () => {
            mockUserService.getUser.mockResolvedValue({ ...regularUser, permissions: new Set(regularUser.permissions) });
            mockExtraWorkService.getExtraWorkForUser.mockResolvedValue([{ _id: 'work3' }]);

            const response = await request(app)
                .get('/api/extrawork')
                .set('Accept', 'application/json')
                .set('x-mock-user-type', 'regular'); // Set header to specify the user

            expect(response.status).toBe(200);
            expect(response.body).toEqual([{ _id: 'work3' }]);
            expect(mockExtraWorkService.getExtraWorkForUser).toHaveBeenCalledWith(regularUser.id);
            expect(mockExtraWorkService.getExtraWork).not.toHaveBeenCalled();
        });
    });

    // --- Test Suite for POST /api/extrawork ---
    describe('POST /api/extrawork', () => {
        it('should create a new extra work item and return 201', async () => {
            const workData = {
                studentId: new Types.ObjectId().toHexString(),
                commissionerId: new Types.ObjectId().toHexString(),
                workType: 'Report Writing',
                details: 'Annual student progress report',
                remuneration: 200,
            };
            mockExtraWorkService.createExtraWork.mockResolvedValue({ _id: new Types.ObjectId(), ...workData });

            const response = await request(app)
                .post('/api/extrawork')
                .send(workData)
                .set('x-mock-user-type', 'regular');

            expect(response.status).toBe(201);
            expect(mockExtraWorkService.createExtraWork).toHaveBeenCalledWith(regularUser.id, workData.studentId, workData.commissionerId, workData.workType, workData.details, workData.remuneration);
        });

        it('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/extrawork')
                .send({ studentId: '123' }) // Incomplete data
                .set('x-mock-user-type', 'regular');
            
            expect(response.status).toBe(400);
        });
    });

    // --- Test Suite for PATCH /api/extrawork/:workId/complete ---
    describe('PATCH /api/extrawork/:workId/complete', () => {
        const workId = new Types.ObjectId().toHexString();

        it('should mark work as complete and return 200', async () => {
            const completionDate = new Date().toISOString();
            mockExtraWorkService.completeExtraWork.mockResolvedValue({ _id: workId, status: EExtraWorkStatus.Completed });

            const response = await request(app)
                .patch(`/api/extrawork/${workId}/complete`)
                .send({ dateCompleted: completionDate })
                .set('x-mock-user-type', 'regular');
            
            expect(response.status).toBe(200);
            expect(mockExtraWorkService.completeExtraWork).toHaveBeenCalledWith(workId, expect.any(Date));
        });

        it('should return 404 if the work item is not found', async () => {
            mockExtraWorkService.completeExtraWork.mockResolvedValue(null);
            
            const response = await request(app)
                .patch(`/api/extrawork/${workId}/complete`)
                .send({ dateCompleted: new Date().toISOString() })
                .set('x-mock-user-type', 'regular');
            
            expect(response.status).toBe(404);
        });
    });

    // --- Test Suite for PATCH /api/extrawork/:workId/status ---
    describe('PATCH /api/extrawork/:workId/status', () => {
        const workId = new Types.ObjectId().toHexString();

        it('should update work status and return 200', async () => {
            const newStatus = EExtraWorkStatus.Approved;
            mockExtraWorkService.setExtraWorkStatus.mockResolvedValue({ _id: workId, status: newStatus });

            const response = await request(app)
                .patch(`/api/extrawork/${workId}/status`)
                .send({ status: newStatus })
                .set('x-mock-user-type', 'admin');

            expect(response.status).toBe(200);
            expect(mockExtraWorkService.setExtraWorkStatus).toHaveBeenCalledWith(workId, newStatus);
        });

        it('should return 400 for an invalid status value', async () => {
            const response = await request(app)
                .patch(`/api/extrawork/${workId}/status`)
                .send({ status: 'invalid-status' })
                .set('x-mock-user-type', 'admin');

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid status');
        });
    });
});

