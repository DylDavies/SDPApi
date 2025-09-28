import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import usersRouter from '../../src/app/routes/users/router';
import UserService from '../../src/app/services/UserService';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { ELeave } from '../../src/app/models/enums/ELeave.enum';
import IPayloadUser from '../../src/app/models/interfaces/IPayloadUser.interface';
import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';

declare global {
    namespace Express {
        interface Request {
            user?: IPayloadUser | JwtPayload | undefined;
        }
    }
}

// Mock the dependencies
jest.mock('../../src/app/services/UserService');

jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
            id: new Types.ObjectId().toHexString(),
            email: 'test@admin.com',
            displayName: 'Test Admin',
            firstLogin: false,
            permissions: [EPermission.USERS_VIEW, EPermission.USERS_MANAGE_ROLES, EPermission.USERS_EDIT, EPermission.USERS_DELETE],
            type: EUserType.Admin,
        };
        next();
    }),
}));

jest.mock('../../src/app/middleware/permission.middleware', () => ({
    // Mock the hasPermission middleware to always call next()
    // This allows us to test the route handler logic in isolation
    hasPermission: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

const app = express();
// Add middleware that our router expects
app.use(express.json());
app.use('/api/users', usersRouter);

describe('Users Router', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/users', () => {
        it('should return 200 and a list of users', async () => {
            const mockUsers = [{ displayName: 'User 1' }, { displayName: 'User 2' }];
            (UserService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

            const response = await request(app).get('/api/users');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockUsers);
        });

        it('should return 500 on a service error', async () => {
            (UserService.getAllUsers as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).get('/api/users');
            expect(response.status).toBe(500);
            expect(response.body.message).toContain('Error fetching users');
        });
    });

    describe('POST /api/users/:userId/roles', () => {
        it('should return 200 and the updated user on success', async () => {
            const updatedUser = { displayName: 'User With Role' };
            (UserService.assignRoleToUser as jest.Mock).mockResolvedValue(updatedUser);

            const response = await request(app)
                .post('/api/users/targetUserId/roles')
                .send({ roleId: 'role123' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedUser);
            expect(UserService.assignRoleToUser).toHaveBeenCalledWith(expect.any(String), 'targetUserId', 'role123', true);
        });
        
        it('should return 400 if roleId is not provided', async () => {
            const response = await request(app)
                .post('/api/users/targetUserId/roles')
                .send({}); // No roleId
            
            expect(response.status).toBe(400);
            expect(response.text).toBe('roleId is required.');
        });

        it('should return 403 if the service throws an error', async () => {
            (UserService.assignRoleToUser as jest.Mock).mockRejectedValue(new Error('Forbidden'));
            const response = await request(app)
                .post('/api/users/targetUserId/roles')
                .send({ roleId: 'role123' });

            expect(response.status).toBe(403);
            expect(response.body.message).toContain('Error assigning role');
        });
    });

    describe('DELETE /api/users/:userId/roles/:roleId', () => {
        it('should return 200 and the updated user on success', async () => {
            const updatedUser = { displayName: 'User Without Role' };
            (UserService.removeRoleFromUser as jest.Mock).mockResolvedValue(updatedUser);

            const response = await request(app).delete('/api/users/targetUserId/roles/role123');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedUser);
        });
    });

    describe('User Status Routes (approve, disable, enable)', () => {
        const routes = [
            { path: 'approve', serviceMethod: 'approveUser' },
            { path: 'disable', serviceMethod: 'disableUser' },
            { path: 'enable', serviceMethod: 'enableUser' },
        ];

        routes.forEach(({ path, serviceMethod }) => {
            it(`POST /api/users/:userId/${path} should call ${serviceMethod} and return 200`, async () => {
                (UserService[serviceMethod as keyof typeof UserService] as jest.Mock).mockResolvedValue({ status: 'updated' });
                const response = await request(app).post(`/api/users/targetUserId/${path}`);
                expect(response.status).toBe(200);
                expect(UserService[serviceMethod as keyof typeof UserService]).toHaveBeenCalledWith('targetUserId');
            });
        });
    });

    describe('POST /api/users/:userId/type', () => {
        it('should return 200 and the updated user on success', async () => {
            (UserService.updateUserType as jest.Mock).mockResolvedValue({ type: EUserType.Staff });
            const response = await request(app)
                .post('/api/users/targetUserId/type')
                .send({ type: EUserType.Staff });
            
            expect(response.status).toBe(200);
            expect(UserService.updateUserType).toHaveBeenCalledWith('targetUserId', EUserType.Staff);
        });

        it('should return 400 if type is not provided', async () => {
            const response = await request(app)
                .post('/api/users/targetUserId/type')
                .send({});
            
            expect(response.status).toBe(400);
        });
    });

    describe('PATCH /api/users/:userId/leave/:leaveId', () => {
        it('should return 200 and the updated user on success', async () => {
            (UserService.updateLeaveRequestStatus as jest.Mock).mockResolvedValue({ approved: ELeave.Approved });
            
            const response = await request(app)
                .patch('/api/users/targetUserId/leave/leave123')
                .send({ approved: ELeave.Approved });
            
            expect(response.status).toBe(200);
            expect(UserService.updateLeaveRequestStatus).toHaveBeenCalledWith('targetUserId', 'leave123', ELeave.Approved);
        });

        it('should return 400 for an invalid "approved" status', async () => {
            const response = await request(app)
                .patch('/api/users/targetUserId/leave/leave123')
                .send({ approved: 'invalid_status' });
            
            expect(response.status).toBe(400);
        });

        it('should return 404 if the user or leave request is not found', async () => {
            (UserService.updateLeaveRequestStatus as jest.Mock).mockResolvedValue(null);
            const response = await request(app)
                .patch('/api/users/targetUserId/leave/leave123')
                .send({ approved: ELeave.Denied });
            
            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/users/:userId/proficiencies/:profName', () => {
        it('should return 200 and the updated user on successful deletion', async () => {
            (UserService.deleteProficiency as jest.Mock).mockResolvedValue({ proficiencies: [] });
            
            const response = await request(app).delete('/api/users/targetUserId/proficiencies/Math');

            expect(response.status).toBe(200);
            expect(UserService.deleteProficiency).toHaveBeenCalledWith('targetUserId', 'Math');
        });

        it('should return 404 if the user or proficiency is not found', async () => {
            (UserService.deleteProficiency as jest.Mock).mockResolvedValue(null);
            
            const response = await request(app).delete('/api/users/targetUserId/proficiencies/Math');
            
            expect(response.status).toBe(404);
        });
    });

    describe('PATCH /api/users/:userId/availability', () => {
        it('should return 200 and the updated user on success', async () => {
            (UserService.updateAvailability as jest.Mock).mockResolvedValue({ availability: 10 });

            const response = await request(app)
                .patch('/api/users/targetUserId/availability')
                .send({ availability: 10 });
            
            expect(response.status).toBe(200);
            expect(UserService.updateAvailability).toHaveBeenCalledWith('targetUserId', 10);
        });

        it('should return 400 if availability is not a number', async () => {
            const response = await request(app)
                .patch('/api/users/targetUserId/availability')
                .send({ availability: 'ten' });

            expect(response.status).toBe(400);
        });
    });
});

