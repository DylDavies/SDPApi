import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { Types } from 'mongoose';

const mockBadgeService = {
    addOrUpdatebadge: jest.fn(),
    getBadges: jest.fn(),
    deleteBadge: jest.fn(),
    getBadgeRequirement: jest.fn(),
    updateBadgeRequirement: jest.fn(),
    getBadgesByIds: jest.fn(),
};

jest.mock('../../src/app/services/BadgeService', () => ({
    __esModule: true,
    default: mockBadgeService,
}));


jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
            id: new Types.ObjectId().toHexString(),
            email: 'test@admin.com',
            displayName: 'Test Admin',
            firstLogin: false,
            permissions: Object.values(EPermission),
            type: EUserType.Admin,
        };
        next();
    })
}));

jest.mock('../../src/app/middleware/permission.middleware', () => ({
    hasPermission: jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
        next();
    })
}));

const app = express();
app.use(express.json());

const badgeRouter = require('../../src/app/routes/badges/router').default;
app.use('/api/badges', badgeRouter);


describe('Badge Routes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/badges', () => {
        const badgeData = {
            name: 'Test Badge',
            TLA: 'TST',
            image: 'test.png',
            summary: 'A test badge',
            description: 'This is a test badge.',
            permanent: true,
            bonus: 100,
            requirements: 'Complete the tests.',
        };

        it('should create a badge and return 200', async () => {
            mockBadgeService.addOrUpdatebadge.mockResolvedValue({ ...badgeData, _id: new Types.ObjectId() });

            const response = await request(app)
                .post('/api/badges')
                .send(badgeData);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('_id');
            expect(mockBadgeService.addOrUpdatebadge).toHaveBeenCalledWith(badgeData);
        });

        it('should return 400 if badge data is missing', async () => {
            const response = await request(app)
                .post('/api/badges')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Missing badge data');
        });

        it('should return 500 on service error', async () => {
            mockBadgeService.addOrUpdatebadge.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/badges')
                .send(badgeData);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to add or update one badge');
        });
    });

    describe('GET /api/badges', () => {
        it('should return a list of badges and a 200 status code', async () => {
            const mockBadges = [
                { _id: new Types.ObjectId(), name: 'Badge 1' },
                { _id: new Types.ObjectId(), name: 'Badge 2' },
            ];
            mockBadgeService.getBadges.mockResolvedValue(mockBadges);

            const response = await request(app).get('/api/badges');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(expect.any(Array));
            expect(response.body.length).toBe(2);
            expect(mockBadgeService.getBadges).toHaveBeenCalledTimes(1);
        });

        it('should return 500 on service error', async () => {
            mockBadgeService.getBadges.mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/api/badges');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to get all badges');
        });
    });


    describe('DELETE /api/badges/:badgeId', () => {
        it('should delete a badge and return 200', async () => {
            const badgeId = new Types.ObjectId().toHexString();
            mockBadgeService.deleteBadge.mockResolvedValue({ deletedCount: 1 });

            const response = await request(app)
                .delete(`/api/badges/${badgeId}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Badge deleted successfully');
            expect(mockBadgeService.deleteBadge).toHaveBeenCalledWith(badgeId);
        });
    });

    describe('GET /api/badges/:badgeId/requirements', () => {
        it('should return badge requirements and a 200 status code', async () => {
            const badgeId = new Types.ObjectId().toHexString();
            const mockRequirements = { requirements: 'Test requirements' };
            mockBadgeService.getBadgeRequirement.mockResolvedValue(mockRequirements);

            const response = await request(app).get(`/api/badges/${badgeId}/requirements`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockRequirements);
            expect(mockBadgeService.getBadgeRequirement).toHaveBeenCalledWith(badgeId);
        });
    });

    describe('PATCH /api/badges/:badgeId/requirements', () => {
        const badgeId = new Types.ObjectId().toHexString();
        const requirementsData = { requirements: 'Updated requirements' };

        it('should update badge requirements and return 200', async () => {
            mockBadgeService.updateBadgeRequirement.mockResolvedValue({ ...requirementsData });

            const response = await request(app)
                .patch(`/api/badges/${badgeId}/requirements`)
                .send(requirementsData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(requirementsData);
            expect(mockBadgeService.updateBadgeRequirement).toHaveBeenCalledWith(badgeId, requirementsData.requirements);
        });

        it('should return 400 if requirements data is missing', async () => {
            const response = await request(app)
                .patch(`/api/badges/${badgeId}/requirements`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Requirements text is missing or invalid.');
        });
    });

    describe('POST /api/badges/by-ids', () => {
        it('should return 400 if ids is not an array', async () => {
            const response = await request(app)
                .post('/api/badges/by-ids')
                .send({ ids: 'not-an-array' });

            expect(response.status).toBe(400);
            expect(response.body.msg).toBe('An array of badge IDs is required.');
        });

        it('should return 500 on a service error', async () => {
            mockBadgeService.getBadgesByIds.mockRejectedValue(new Error('DB Error'));
            const response = await request(app)
                .post('/api/badges/by-ids')
                .send({ ids: [] });

            expect(response.status).toBe(500);
            expect(response.text).toBe('Server Error');
        });
    });
});