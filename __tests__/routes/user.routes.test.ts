import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock services
const mockUserService = {
    getUser: jest.fn(),
    editUser: jest.fn(),
    updateUserPreferences: jest.fn(),
};

const mockLoggingService = {
    error: jest.fn(),
};

// Mock Singleton
jest.mock('../../src/app/models/classes/Singleton', () => ({
    Singleton: {
        getInstance: jest.fn().mockImplementation((serviceClass: any) => {
            if (serviceClass.name === 'UserService') {
                return mockUserService;
            }
            if (serviceClass.name === 'LoggingService') {
                return mockLoggingService;
            }
            return {};
        })
    }
}));

jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
            id: new Types.ObjectId().toHexString(),
            email: 'test@tutor.com',
            displayName: 'Test User',
            firstLogin: false,
            permissions: [EPermission.VIEW_USER_PROFILE],
            type: EUserType.Admin,
        };
        next();
    }),
}));

const app = express();
app.use(express.json());

const userRouter = require('../../src/app/routes/user/router').default;
app.use('/api/user', userRouter);

describe('User Routes', () => {
    let mockUser: any;

    beforeEach(() => {
        mockUser = {
            _id: new Types.ObjectId().toHexString(),
            email: 'test@tutor.com',
            displayName: 'Test User',
            preferences: { theme: 'light' },
            type: EUserType.Client,
        };

        jest.clearAllMocks();
    });

    describe('GET /api/user', () => {
        it('should return user data for authenticated user', async () => {
            mockUserService.getUser.mockResolvedValue(mockUser);

            const response = await request(app).get('/api/user');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockUser);
            expect(mockUserService.getUser).toHaveBeenCalledWith(expect.any(String));
        });

        it('should return 404 when user not found', async () => {
            mockUserService.getUser.mockResolvedValue(null);

            const response = await request(app).get('/api/user');

            expect(response.status).toBe(404);
            expect(response.text).toBe('User not found');
            expect(mockLoggingService.error).toHaveBeenCalledWith('User was not returned');
        });

        it('should return 500 when service throws error', async () => {
            mockUserService.getUser.mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/api/user');

            expect(response.status).toBe(500);
            expect(response.text).toBe('Internal Server Error');
            expect(mockLoggingService.error).toHaveBeenCalledWith('Error fetching user.', expect.any(Error));
        });
    });

    describe('PATCH /api/user', () => {
        it('should update user data successfully', async () => {
            const updateData = { displayName: 'Updated Name', email: 'updated@tutor.com' };
            const updatedUser = { ...mockUser, ...updateData };
            mockUserService.editUser.mockResolvedValue(updatedUser);

            const response = await request(app)
                .patch('/api/user')
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedUser);
            expect(mockUserService.editUser).toHaveBeenCalledWith(
                expect.any(String),
                updateData
            );
        });

        it('should filter out protected fields from update data', async () => {
            const updateData = {
                displayName: 'Updated Name',
                googleId: 'should-be-removed',
                createdAt: new Date(),
                _id: new Types.ObjectId()
            };
            const expectedUpdateData = { displayName: 'Updated Name' };
            const updatedUser = { ...mockUser, displayName: 'Updated Name' };
            mockUserService.editUser.mockResolvedValue(updatedUser);

            const response = await request(app)
                .patch('/api/user')
                .send(updateData);

            expect(response.status).toBe(200);
            expect(mockUserService.editUser).toHaveBeenCalledWith(
                expect.any(String),
                expectedUpdateData
            );
        });

        it('should return 400 when no valid fields provided', async () => {
            const updateData = {
                googleId: 'should-be-removed',
                createdAt: new Date(),
                _id: new Types.ObjectId()
            };

            const response = await request(app)
                .patch('/api/user')
                .send(updateData);

            expect(response.status).toBe(400);
            expect(response.text).toBe('No valid fields provided');
            expect(mockUserService.editUser).not.toHaveBeenCalled();
        });

        it('should return 404 when updated user not found', async () => {
            const updateData = { displayName: 'Updated Name' };
            mockUserService.editUser.mockResolvedValue(null);

            const response = await request(app)
                .patch('/api/user')
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.text).toBe('Updated user not found');
        });

        it('should return 500 when service throws error', async () => {
            const updateData = { displayName: 'Updated Name' };
            mockUserService.editUser.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .patch('/api/user')
                .send(updateData);

            expect(response.status).toBe(500);
            expect(response.text).toBe('Internal Server Error');
            expect(mockLoggingService.error).toHaveBeenCalledWith('Error updating user.', expect.any(Error));
        });
    });

    describe('PATCH /api/user/preferences', () => {
        it('should update user preferences successfully', async () => {
            mockUserService.updateUserPreferences.mockResolvedValue(undefined);

            const response = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'dark' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: 'Preferences updated successfully.' });
            expect(mockUserService.updateUserPreferences).toHaveBeenCalledWith(
                expect.any(String),
                { theme: 'dark' }
            );
        });

        it('should update user preferences with light theme', async () => {
            mockUserService.updateUserPreferences.mockResolvedValue(undefined);

            const response = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'light' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: 'Preferences updated successfully.' });
            expect(mockUserService.updateUserPreferences).toHaveBeenCalledWith(
                expect.any(String),
                { theme: 'light' }
            );
        });

        it('should update user preferences with system theme', async () => {
            mockUserService.updateUserPreferences.mockResolvedValue(undefined);

            const response = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'system' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: 'Preferences updated successfully.' });
            expect(mockUserService.updateUserPreferences).toHaveBeenCalledWith(
                expect.any(String),
                { theme: 'system' }
            );
        });

        it('should return 400 for invalid theme value', async () => {
            const response = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'invalid-theme' });

            expect(response.status).toBe(400);
            expect(response.text).toBe('Invalid theme value.');
            expect(mockUserService.updateUserPreferences).not.toHaveBeenCalled();
        });

        it('should return 200 when service completes (no await means no error handling)', async () => {
            // Note: The route doesn't await updateUserPreferences, so it can't catch async errors
            mockUserService.updateUserPreferences.mockResolvedValue(undefined);

            const response = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'dark' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: 'Preferences updated successfully.' });
            expect(mockUserService.updateUserPreferences).toHaveBeenCalledWith(
                expect.any(String),
                { theme: 'dark' }
            );
        });

        it('should return 500 when service throws error', async () => {
            mockUserService.updateUserPreferences.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'dark' });

            expect(response.status).toBe(500);
            expect(response.text).toBe('Internal Server Error');
            expect(mockLoggingService.error).toHaveBeenCalledWith('Error updating user preferences.', expect.any(Error));
        });
    });
});