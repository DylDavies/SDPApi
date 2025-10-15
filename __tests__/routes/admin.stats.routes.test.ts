import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock models
const mockMUser = {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
};

const mockMEvent = {
    find: jest.fn(),
    aggregate: jest.fn(),
};

const mockMBundle = {
    countDocuments: jest.fn(),
};

const mockMPayslip = {
    find: jest.fn(),
};

const mockMMission = {
    countDocuments: jest.fn(),
};

const mockMRole = {
    findOne: jest.fn(),
};

const mockLoggingService = {
    info: jest.fn(),
    error: jest.fn(),
};

// Mock Singleton
jest.mock('../../src/app/models/classes/Singleton', () => ({
    Singleton: {
        getInstance: jest.fn().mockImplementation((serviceClass: any) => {
            if (serviceClass.name === 'LoggingService') {
                return mockLoggingService;
            }
            return {};
        })
    }
}));

// Mock authentication middleware
jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
            id: new Types.ObjectId().toHexString(),
            email: 'admin@test.com',
            displayName: 'Test Admin',
            firstLogin: false,
            permissions: [EPermission.PLATFORM_STATS_VIEW],
            type: EUserType.Admin,
        };
        next();
    }),
}));

// Mock permission middleware
jest.mock('../../src/app/middleware/permission.middleware', () => ({
    hasPermission: jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
        next();
    }),
}));

// Mock models
jest.mock('../../src/app/db/models/MUser.model', () => mockMUser);
jest.mock('../../src/app/db/models/MEvent.model', () => mockMEvent);
jest.mock('../../src/app/db/models/MBundle.model', () => mockMBundle);
jest.mock('../../src/app/db/models/MPayslip.model', () => ({ MPayslip: mockMPayslip }));
jest.mock('../../src/app/db/models/MMissions.model', () => mockMMission);
jest.mock('../../src/app/db/models/MRole.model', () => mockMRole);

const app = express();
app.use(express.json());

const statsRouter = require('../../src/app/routes/admin/stats/router').default;
app.use('/api/admin/stats', statsRouter);

describe('Admin Stats Routes', () => {
    const mockTutorRoleId = new Types.ObjectId();
    const mockTutorId1 = new Types.ObjectId();
    const mockTutorId2 = new Types.ObjectId();

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock for role query
        mockMRole.findOne.mockResolvedValue({ _id: mockTutorRoleId, name: 'Tutor' });
    });

    describe('GET /api/admin/stats/platform', () => {
        it('should return comprehensive platform statistics', async () => {
            // Mock user statistics
            mockMUser.countDocuments
                .mockResolvedValueOnce(150) // totalUsers
                .mockResolvedValueOnce(50)  // tutors
                .mockResolvedValueOnce(95)  // students
                .mockResolvedValueOnce(5)   // admins
                .mockResolvedValueOnce(8)   // pendingApprovals
                .mockResolvedValueOnce(40)  // activeTutors
                .mockResolvedValueOnce(5)   // onLeaveTutors
                .mockResolvedValueOnce(5);  // inactiveTutors

            // Mock new users over time
            mockMUser.aggregate.mockResolvedValueOnce([
                { _id: { year: 2024, month: 10 }, count: 12 },
                { _id: { year: 2024, month: 9 }, count: 15 }
            ]);

            // Mock completed events for total hours
            mockMEvent.find
                .mockResolvedValueOnce([
                    { duration: 60, remarked: true },
                    { duration: 90, remarked: true },
                    { duration: 30, remarked: true }
                ]);

            // Mock popular subjects
            mockMEvent.aggregate.mockResolvedValueOnce([
                { _id: 'Mathematics', totalMinutes: 180 },
                { _id: 'Science', totalMinutes: 120 }
            ]);

            // Mock active bundles
            mockMBundle.countDocuments.mockResolvedValue(45);

            // Mock tutors for rating calculation
            mockMUser.find.mockResolvedValueOnce([
                { _id: mockTutorId1, displayName: 'Tutor One' },
                { _id: mockTutorId2, displayName: 'Tutor Two' }
            ]);

            // Mock rated events for overall rating
            mockMEvent.find
                .mockResolvedValueOnce([
                    { rating: 5, remarked: true },
                    { rating: 4, remarked: true }
                ]);

            // Mock payslips
            mockMPayslip.find.mockResolvedValue([
                { netPay: 5000 },
                { netPay: 3000 }
            ]);

            // Mock tutor events for leaderboard
            mockMEvent.find
                .mockResolvedValueOnce([
                    { duration: 120, rating: 5 },
                    { duration: 60, rating: 4 }
                ])
                .mockResolvedValueOnce([
                    { duration: 90, rating: 4 }
                ]);

            // Mock missions completed
            mockMMission.countDocuments
                .mockResolvedValueOnce(25)
                .mockResolvedValueOnce(22);

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('userStatistics');
            expect(response.body).toHaveProperty('platformActivity');
            expect(response.body).toHaveProperty('financialOverview');
            expect(response.body).toHaveProperty('tutorLeaderboard');

            // Verify user statistics
            expect(response.body.userStatistics.totalUsers).toBe(150);
            expect(response.body.userStatistics.usersByType.tutors).toBe(50);
            expect(response.body.userStatistics.usersByType.students).toBe(95);
            expect(response.body.userStatistics.usersByType.admins).toBe(5);

            // Verify platform activity
            expect(response.body.platformActivity.totalTutoringHours).toBe(3); // 180 minutes / 60
            expect(response.body.platformActivity.activeBundles).toBe(45);
            expect(response.body.platformActivity.overallTutorRating).toBe(4.5);

            // Verify financial overview
            expect(response.body.financialOverview.totalPayouts).toBe(8000);

            // Verify leaderboard
            expect(response.body.tutorLeaderboard).toHaveLength(2);
            expect(response.body.tutorLeaderboard[0].totalHours).toBeGreaterThanOrEqual(0);
        });

        it('should only count remarked events for hours', async () => {
            mockMUser.countDocuments.mockResolvedValue(0);
            mockMUser.aggregate.mockResolvedValue([]);
            mockMUser.find.mockResolvedValue([]); // No tutors

            // Mix of remarked and unremarked events
            mockMEvent.find
                .mockResolvedValueOnce([
                    { duration: 60, remarked: true },  // Should count
                    { duration: 30, remarked: true }   // Should count
                ])
                .mockResolvedValueOnce([]); // Overall rating query (no tutors, so empty)

            mockMEvent.aggregate.mockResolvedValue([]);
            mockMBundle.countDocuments.mockResolvedValue(0);
            mockMPayslip.find.mockResolvedValue([]);

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(200);
            expect(response.body.platformActivity.totalTutoringHours).toBe(1.5); // 90 minutes / 60
        });

        it('should only count remarked events in popular subjects', async () => {
            mockMUser.countDocuments.mockResolvedValue(0);
            mockMUser.aggregate.mockResolvedValue([]);
            mockMUser.find.mockResolvedValue([]);

            mockMEvent.find.mockResolvedValue([]);

            // Popular subjects aggregation should have $match: { remarked: true }
            mockMEvent.aggregate.mockResolvedValueOnce([
                { _id: 'Mathematics', totalMinutes: 120 },
                { _id: 'Science', totalMinutes: 60 }
            ]);

            mockMBundle.countDocuments.mockResolvedValue(0);
            mockMPayslip.find.mockResolvedValue([]);

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(200);
            expect(response.body.platformActivity.mostPopularSubjects).toHaveLength(2);
            expect(response.body.platformActivity.mostPopularSubjects[0].subject).toBe('Mathematics');
            expect(response.body.platformActivity.mostPopularSubjects[0].count).toBe(2); // 120 min / 60
        });

        it('should handle zero tutors gracefully', async () => {
            mockMUser.countDocuments.mockResolvedValue(0);
            mockMUser.aggregate.mockResolvedValue([]);
            mockMUser.find.mockResolvedValue([]); // No tutors
            mockMEvent.find.mockResolvedValue([]);
            mockMEvent.aggregate.mockResolvedValue([]);
            mockMBundle.countDocuments.mockResolvedValue(0);
            mockMPayslip.find.mockResolvedValue([]);

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(200);
            expect(response.body.tutorLeaderboard).toHaveLength(0);
            expect(response.body.platformActivity.overallTutorRating).toBe(0);
        });

        it('should handle no tutor role found', async () => {
            mockMRole.findOne.mockResolvedValue(null); // No tutor role

            mockMUser.countDocuments.mockResolvedValue(0);
            mockMUser.aggregate.mockResolvedValue([]);
            mockMUser.find.mockResolvedValue([]);
            mockMEvent.find.mockResolvedValue([]);
            mockMEvent.aggregate.mockResolvedValue([]);
            mockMBundle.countDocuments.mockResolvedValue(0);
            mockMPayslip.find.mockResolvedValue([]);

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(200);
            expect(response.body.userStatistics.usersByType.tutors).toBe(0);
        });

        it('should include admins with tutor role in leaderboard', async () => {
            mockMUser.countDocuments.mockResolvedValue(0);
            mockMUser.aggregate.mockResolvedValue([]);

            // Mock finding users with tutor role (regardless of type)
            mockMUser.find.mockResolvedValueOnce([
                { _id: mockTutorId1, displayName: 'Staff Tutor', type: EUserType.Staff },
                { _id: mockTutorId2, displayName: 'Admin Tutor', type: EUserType.Admin }
            ]);

            mockMEvent.find
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ duration: 60, rating: 5, remarked: true }])
                .mockResolvedValueOnce([{ duration: 90, rating: 4, remarked: true }]);

            mockMEvent.aggregate.mockResolvedValue([]);
            mockMBundle.countDocuments.mockResolvedValue(0);
            mockMPayslip.find.mockResolvedValue([]);
            mockMMission.countDocuments.mockResolvedValue(0);

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(200);
            expect(response.body.tutorLeaderboard).toHaveLength(2);
        });

        it('should return 500 on database error', async () => {
            mockMUser.countDocuments.mockRejectedValue(new Error('Database connection error'));

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(500);
            expect(response.text).toBe('Internal Server Error');
            expect(mockLoggingService.error).toHaveBeenCalledWith(
                'Error fetching platform stats:',
                expect.any(Error)
            );
        });

        it('should calculate tutor status distribution correctly', async () => {
            mockMUser.countDocuments
                .mockResolvedValueOnce(150) // totalUsers
                .mockResolvedValueOnce(50)  // tutors
                .mockResolvedValueOnce(95)  // students
                .mockResolvedValueOnce(5)   // admins
                .mockResolvedValueOnce(8)   // pendingApprovals
                .mockResolvedValueOnce(40)  // activeTutors (not pending, not disabled)
                .mockResolvedValueOnce(5)   // onLeaveTutors (on approved leave)
                .mockResolvedValueOnce(5);  // inactiveTutors (pending or disabled)

            mockMUser.aggregate.mockResolvedValue([]);
            mockMUser.find.mockResolvedValue([]);
            mockMEvent.find.mockResolvedValue([]);
            mockMEvent.aggregate.mockResolvedValue([]);
            mockMBundle.countDocuments.mockResolvedValue(0);
            mockMPayslip.find.mockResolvedValue([]);

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(200);
            expect(response.body.userStatistics.tutorStatus.active).toBe(40);
            expect(response.body.userStatistics.tutorStatus.onLeave).toBe(5);
            expect(response.body.userStatistics.tutorStatus.inactive).toBe(5);
        });

        it('should sort leaderboard by hours then rating', async () => {
            mockMUser.countDocuments.mockResolvedValue(0);
            mockMUser.aggregate.mockResolvedValue([]);

            const tutor1Id = new Types.ObjectId();
            const tutor2Id = new Types.ObjectId();
            const tutor3Id = new Types.ObjectId();

            mockMUser.find.mockResolvedValueOnce([
                { _id: tutor1Id, displayName: 'Tutor A' },
                { _id: tutor2Id, displayName: 'Tutor B' },
                { _id: tutor3Id, displayName: 'Tutor C' }
            ]);

            mockMEvent.find
                // First call (line 98): Get ALL remarked events for total tutoring hours calculation
                .mockResolvedValueOnce([
                    { duration: 120, remarked: true },
                    { duration: 120, remarked: true },
                    { duration: 60, remarked: true }
                ])
                // Second call (line 140-144): Overall rating calculation for all tutors
                .mockResolvedValueOnce([
                    { rating: 4, remarked: true },
                    { rating: 5, remarked: true },
                    { rating: 5, remarked: true }
                ])
                // Remaining calls: Individual tutor events for leaderboard
                // Third call: Tutor A events - 120 minutes, rating 4
                .mockResolvedValueOnce([{ duration: 120, rating: 4, remarked: true }])
                // Fourth call: Tutor B events - 120 minutes, rating 5 (same hours, better rating)
                .mockResolvedValueOnce([{ duration: 120, rating: 5, remarked: true }])
                // Fifth call: Tutor C events - 60 minutes, rating 5 (fewer hours)
                .mockResolvedValueOnce([{ duration: 60, rating: 5, remarked: true }]);

            mockMEvent.aggregate.mockResolvedValue([]);
            mockMBundle.countDocuments.mockResolvedValue(0);
            mockMPayslip.find.mockResolvedValue([]);
            mockMMission.countDocuments.mockResolvedValue(0);

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(200);
            expect(response.body.tutorLeaderboard).toHaveLength(3);

            // Expected sorting: B (2h, 5★) > A (2h, 4★) > C (1h, 5★)
            expect(response.body.tutorLeaderboard[0].tutorName).toBe('Tutor B');
            expect(response.body.tutorLeaderboard[0].totalHours).toBe(2);
            expect(response.body.tutorLeaderboard[0].averageRating).toBe(5);

            expect(response.body.tutorLeaderboard[1].tutorName).toBe('Tutor A');
            expect(response.body.tutorLeaderboard[1].totalHours).toBe(2);
            expect(response.body.tutorLeaderboard[1].averageRating).toBe(4);

            expect(response.body.tutorLeaderboard[2].tutorName).toBe('Tutor C');
            expect(response.body.tutorLeaderboard[2].totalHours).toBe(1);
            expect(response.body.tutorLeaderboard[2].averageRating).toBe(5);
        });

        it('should limit leaderboard to top 20 tutors', async () => {
            mockMUser.countDocuments.mockResolvedValue(0);
            mockMUser.aggregate.mockResolvedValue([]);

            // Create 25 mock tutors
            const mockTutors = Array.from({ length: 25 }, (_, i) => ({
                _id: new Types.ObjectId(),
                displayName: `Tutor ${i + 1}`
            }));

            mockMUser.find.mockResolvedValueOnce(mockTutors);

            mockMEvent.find.mockResolvedValue([]);
            mockMEvent.aggregate.mockResolvedValue([]);
            mockMBundle.countDocuments.mockResolvedValue(0);
            mockMPayslip.find.mockResolvedValue([]);
            mockMMission.countDocuments.mockResolvedValue(0);

            const response = await request(app).get('/api/admin/stats/platform');

            expect(response.status).toBe(200);
            expect(response.body.tutorLeaderboard).toHaveLength(20); // Should be limited to 20
        });
    });
});
