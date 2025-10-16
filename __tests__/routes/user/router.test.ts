// __tests__/routes/user/router.test.ts

import request from 'supertest';
import express from 'express';
import userRouter from '../../../src/app/routes/user/router';
import MUser from '../../../src/app/db/models/MUser.model';
import MEvent from '../../../src/app/db/models/MEvent.model';
import { MPayslip } from '../../../src/app/db/models/MPayslip.model';
import MMission from '../../../src/app/db/models/MMissions.model';
import { Types } from 'mongoose';
import { IUser } from '../../../src/app/db/models/MUser.model';
import { ELeave } from '../../../src/app/models/enums/ELeave.enum';

// Mock the services and middleware
jest.mock('../../../src/app/db/models/MUser.model');
jest.mock('../../../src/app/db/models/MEvent.model');
jest.mock('../../../src/app/db/models/MPayslip.model');
jest.mock('../../../src/app/db/models/MMissions.model');
jest.mock('../../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: (req: any, res: any, next: () => void) => {
        req.user = { id: 'user123' };
        next();
    },
}));

// Mock the Singleton to return a mocked UserService
jest.mock('../../../src/app/models/classes/Singleton', () => {
    const mockUserService = {
        getUser: jest.fn(),
        editUser: jest.fn(),
        updateUserPreferences: jest.fn()
    };

    return {
        Singleton: {
            getInstance: jest.fn((ServiceClass: any) => {
                if (ServiceClass?.name === 'UserService') {
                    return mockUserService;
                }
                // Return a mock for LoggingService if needed
                return {
                    log: jest.fn(),
                    error: jest.fn(),
                    warn: jest.fn(),
                    info: jest.fn()
                };
            }),
            mockUserService // Export for access in tests
        }
    };
});

const app = express();
app.use(express.json());
app.use('/api/user', userRouter);

// Get reference to the mock user service
const { Singleton } = require('../../../src/app/models/classes/Singleton');
const mockUserService = (Singleton as any).mockUserService;

const mockUser: Partial<IUser> = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    googleId: 'google123',
    email: 'test@example.com',
    displayName: 'Test User',
    picture: 'https://example.com/photo.jpg',
    createdAt: new Date(),
    theme: 'light',
    leave: [
        {
            _id: new Types.ObjectId().toString(),
            reason: 'Vacation',
            startDate: new Date('2025-01-15'),
            endDate: new Date('2025-01-20'),
            approved: ELeave.Approved
        }
    ],
    badges: []
};

describe('User Router', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/user', () => {
        it('should return the current user with 200 status', async () => {
            mockUserService.getUser.mockResolvedValue(mockUser);

            const res = await request(app).get('/api/user');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('email', 'test@example.com');
            expect(res.body).toHaveProperty('displayName', 'Test User');
            expect(mockUserService.getUser).toHaveBeenCalledWith('user123');
        });

        it('should return 404 if user not found', async () => {
            mockUserService.getUser.mockResolvedValue(null);

            const res = await request(app).get('/api/user');

            expect(res.status).toBe(404);
            expect(res.text).toBe('User not found');
        });

        it('should handle errors when fetching user', async () => {
            mockUserService.getUser.mockRejectedValue(new Error('Database error'));

            const res = await request(app).get('/api/user');

            expect(res.status).toBe(500);
            expect(res.text).toBe('Internal Server Error');
        });
    });

    describe('PATCH /api/user', () => {
        it('should update user and return 200 status', async () => {
            const updateData = { displayName: 'Updated Name', picture: 'https://example.com/newphoto.jpg' };
            const updatedUser = { ...mockUser, ...updateData };
            mockUserService.editUser.mockResolvedValue(updatedUser);

            const res = await request(app)
                .patch('/api/user')
                .send(updateData);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('displayName', 'Updated Name');
            expect(mockUserService.editUser).toHaveBeenCalledWith('user123', updateData);
        });

        it('should filter out protected fields (googleId, createdAt, _id)', async () => {
            const updateData = {
                displayName: 'Updated Name',
                googleId: 'hacked-google-id',
                createdAt: new Date(),
                _id: new Types.ObjectId()
            };
            const expectedData = { displayName: 'Updated Name' };
            const updatedUser = { ...mockUser, displayName: 'Updated Name' };
            mockUserService.editUser.mockResolvedValue(updatedUser);

            const res = await request(app)
                .patch('/api/user')
                .send(updateData);

            expect(res.status).toBe(200);
            expect(mockUserService.editUser).toHaveBeenCalledWith('user123', expectedData);
        });

        it('should return 400 if no valid fields provided', async () => {
            const updateData = {
                googleId: 'hacked-google-id',
                createdAt: new Date(),
                _id: new Types.ObjectId()
            };

            const res = await request(app)
                .patch('/api/user')
                .send(updateData);

            expect(res.status).toBe(400);
            expect(res.text).toBe('No valid fields provided');
        });

        it('should return 404 if user not found when updating', async () => {
            mockUserService.editUser.mockResolvedValue(null);

            const res = await request(app)
                .patch('/api/user')
                .send({ displayName: 'New Name' });

            expect(res.status).toBe(404);
            expect(res.text).toBe('Updated user not found');
        });

        it('should handle errors when updating user', async () => {
            mockUserService.editUser.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .patch('/api/user')
                .send({ displayName: 'New Name' });

            expect(res.status).toBe(500);
            expect(res.text).toBe('Internal Server Error');
        });
    });

    describe('PATCH /api/user/preferences', () => {
        it('should update user preferences and return 200 status', async () => {
            mockUserService.updateUserPreferences.mockResolvedValue(true);

            const res = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'dark' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Preferences updated successfully.');
            expect(mockUserService.updateUserPreferences).toHaveBeenCalledWith('user123', { theme: 'dark' });
        });

        it('should accept light theme', async () => {
            mockUserService.updateUserPreferences.mockResolvedValue(true);

            const res = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'light' });

            expect(res.status).toBe(200);
            expect(mockUserService.updateUserPreferences).toHaveBeenCalledWith('user123', { theme: 'light' });
        });

        it('should accept system theme', async () => {
            mockUserService.updateUserPreferences.mockResolvedValue(true);

            const res = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'system' });

            expect(res.status).toBe(200);
            expect(mockUserService.updateUserPreferences).toHaveBeenCalledWith('user123', { theme: 'system' });
        });

        it('should return 400 if theme value is invalid', async () => {
            const res = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'invalid-theme' });

            expect(res.status).toBe(400);
            expect(res.text).toBe('Invalid theme value.');
        });

        it('should handle errors when updating preferences', async () => {
            mockUserService.updateUserPreferences.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .patch('/api/user/preferences')
                .send({ theme: 'dark' });

            expect(res.status).toBe(500);
            expect(res.text).toBe('Internal Server Error');
        });
    });

    describe('GET /api/user/stats/:tutorId', () => {
        const tutorId = new Types.ObjectId();
        const mockEvent = {
            _id: new Types.ObjectId(),
            tutor: tutorId,
            student: { _id: new Types.ObjectId(), displayName: 'Student 1' },
            subject: 'Mathematics',
            duration: 120,
            rating: 4.5,
            startTime: new Date(),
            remarked: true
        };

        const mockPayslip = {
            _id: new Types.ObjectId(),
            userId: tutorId,
            payPeriod: '2025-01',
            netPay: 5000
        };

        beforeEach(() => {
            // Mock MUser.findById with populate
            (MUser.findById as jest.Mock) = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        ...mockUser,
                        _id: tutorId,
                        leave: [
                            {
                                _id: new Types.ObjectId().toString(),
                                reason: 'Vacation',
                                startDate: new Date('2025-01-15'),
                                endDate: new Date('2025-01-20'),
                                approved: ELeave.Approved
                            }
                        ],
                        badges: [
                            {
                                badge: {
                                    _id: new Types.ObjectId(),
                                    name: 'Expert Badge',
                                    TLA: 'EXP',
                                    image: 'badge.png',
                                    description: 'Expert tutor'
                                },
                                dateAdded: new Date()
                            }
                        ]
                    })
                })
            });

            // Mock MEvent.find with populate - need to handle both paths (with and without limit)
            (MEvent.find as jest.Mock) = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        exec: jest.fn().mockResolvedValue([mockEvent]),
                        limit: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue([mockEvent])
                        })
                    })
                })
            });

            // Mock MPayslip.find with sort
            (MPayslip.find as jest.Mock) = jest.fn().mockReturnValue({
                sort: jest.fn().mockReturnValue(Promise.resolve([mockPayslip]))
            });

            // Mock MMission.countDocuments
            (MMission.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(5);
        });

        it('should return tutor stats with 200 status', async () => {
            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('kpis');
            expect(res.body).toHaveProperty('charts');
            expect(res.body).toHaveProperty('recentActivity');
            expect(res.body).toHaveProperty('leaveDaysTaken');
            expect(res.body).toHaveProperty('badgeHistory');
        });

        it('should calculate KPIs correctly', async () => {
            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(200);
            expect(res.body.kpis).toHaveProperty('totalHoursTaught', 2); // 120 minutes / 60
            expect(res.body.kpis).toHaveProperty('netPay', 5000);
            expect(res.body.kpis).toHaveProperty('averageRating', 4.5);
            expect(res.body.kpis).toHaveProperty('missionsCompleted', 5);
        });

        it('should calculate hours per subject correctly', async () => {
            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(200);
            expect(res.body.charts.hoursPerSubject).toEqual([
                { subject: 'Mathematics', hours: 2 }
            ]);
        });

        it('should calculate monthly earnings correctly', async () => {
            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(200);
            expect(res.body.charts.monthlyEarnings).toEqual([
                { month: '2025-01', earnings: 5000 }
            ]);
        });

        it('should calculate leave days correctly', async () => {
            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(200);
            // From Jan 15 to Jan 20 is 6 days (inclusive)
            expect(res.body.leaveDaysTaken).toBe(6);
        });

        it('should include badge history', async () => {
            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(200);
            expect(res.body.badgeHistory).toHaveLength(1);
            expect(res.body.badgeHistory[0].badge).toHaveProperty('name', 'Expert Badge');
        });

        it('should return 404 if user not found', async () => {
            (MUser.findById as jest.Mock) = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(null)
                })
            });

            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(404);
            expect(res.text).toBe('User not found');
        });

        it('should handle errors when fetching tutor stats', async () => {
            (MUser.findById as jest.Mock) = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    exec: jest.fn().mockRejectedValue(new Error('Database error'))
                })
            });

            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(500);
            expect(res.text).toBe('Internal Server Error');
        });

        it('should handle events without ratings correctly', async () => {
            const eventWithoutRating = { ...mockEvent, rating: undefined };
            (MEvent.find as jest.Mock) = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        exec: jest.fn().mockResolvedValue([eventWithoutRating]),
                        limit: jest.fn().mockReturnValue({
                            exec: jest.fn().mockResolvedValue([eventWithoutRating])
                        })
                    })
                })
            });

            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(200);
            expect(res.body.kpis.averageRating).toBe(0);
        });

        it('should filter badges correctly when badge is null', async () => {
            (MUser.findById as jest.Mock) = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        ...mockUser,
                        _id: tutorId,
                        leave: [],
                        badges: [
                            { badge: null, dateAdded: new Date() },
                            {
                                badge: {
                                    _id: new Types.ObjectId(),
                                    name: 'Valid Badge',
                                    TLA: 'VLD',
                                    image: 'badge.png',
                                    description: 'Valid badge'
                                },
                                dateAdded: new Date()
                            }
                        ]
                    })
                })
            });

            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(200);
            expect(res.body.badgeHistory).toHaveLength(1);
            expect(res.body.badgeHistory[0].badge.name).toBe('Valid Badge');
        });

        it('should only count approved leave days for current year', async () => {
            (MUser.findById as jest.Mock) = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue({
                        ...mockUser,
                        _id: tutorId,
                        leave: [
                            {
                                _id: new Types.ObjectId().toString(),
                                reason: 'Vacation',
                                startDate: new Date('2025-01-15'),
                                endDate: new Date('2025-01-20'),
                                approved: ELeave.Approved
                            },
                            {
                                _id: new Types.ObjectId().toString(),
                                reason: 'Personal',
                                startDate: new Date('2024-01-15'),
                                endDate: new Date('2024-01-20'),
                                approved: ELeave.Approved
                            },
                            {
                                _id: new Types.ObjectId().toString(),
                                reason: 'Sick leave',
                                startDate: new Date('2025-02-01'),
                                endDate: new Date('2025-02-05'),
                                approved: ELeave.Pending
                            }
                        ],
                        badges: []
                    })
                })
            });

            const res = await request(app).get(`/api/user/stats/${tutorId}`);

            expect(res.status).toBe(200);
            // Only the approved leave from 2025 should be counted (Jan 15-20 = 6 days)
            expect(res.body.leaveDaysTaken).toBe(6);
        });
    });
});
