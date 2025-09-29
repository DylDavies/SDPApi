import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { EPayslipStatus } from '../../src/app/models/enums/EPayslipStatus.enum';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';

// Fixed user ID for consistent testing
const MOCK_USER_ID = new Types.ObjectId().toHexString();

// Mock services and models
const mockPayslipService = {
    getDraftPayslip: jest.fn(),
    getOrCreateDraftPayslip: jest.fn(),
    getPayslipById: jest.fn(),
    updatePayslipStatus: jest.fn(),
    recalculatePayslip: jest.fn(),
    getPreapprovedItems: jest.fn(),
    getPayslipHistory: jest.fn(),
    addQueryNote: jest.fn(),
    updateQueryNote: jest.fn(),
    deleteQueryNote: jest.fn(),
    resolveQueryNote: jest.fn(),
    addBonus: jest.fn(),
    removeBonus: jest.fn(),
    addDeduction: jest.fn(),
    updateDeduction: jest.fn(),
    removeDeduction: jest.fn(),
    addMiscEarning: jest.fn(),
    updateMiscEarning: jest.fn(),
    removeMiscEarning: jest.fn(),
};

const mockMPayslip = {
    find: jest.fn(),
    findById: jest.fn(),
};

const mockUserService = {
    getUser: jest.fn(),
};

jest.mock('../../src/app/services/PayslipService', () => ({
    __esModule: true,
    default: mockPayslipService,
}));

jest.mock('../../src/app/db/models/MPayslip.model', () => ({
    MPayslip: mockMPayslip,
}));

jest.mock('../../src/app/services/UserService', () => ({
    __esModule: true,
    default: mockUserService,
}));

jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
            id: MOCK_USER_ID,
            email: 'test@tutor.com',
            displayName: 'Test User',
            firstLogin: false,
            permissions: [EPermission.CAN_VIEW_OWN_PAYSLIP, EPermission.CAN_MANAGE_PAYSLIPS],
            type: EUserType.Admin,
        };
        next();
    }),
}));

jest.mock('../../src/app/middleware/permission.middleware', () => ({
    hasPermission: jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
        next();
    }),
}));

const app = express();
app.use(express.json());

const payslipRouter = require('../../src/app/routes/payslips/router').default;
app.use('/api/payslips', payslipRouter);

describe('Payslips Routes', () => {
    let mockPayslip: any;
    let mockUserId: string;

    beforeEach(() => {
        mockUserId = MOCK_USER_ID;
        mockPayslip = {
            _id: new Types.ObjectId().toHexString(),
            userId: mockUserId,
            payPeriod: '2025-09',
            status: EPayslipStatus.DRAFT,
            earnings: [],
            bonuses: [],
            miscEarnings: [],
            deductions: [],
            notes: [],
            grossEarnings: 1000,
            totalDeductions: 100,
            paye: 50,
            uif: 10,
            netPay: 840,
            save: jest.fn().mockResolvedValue(undefined),
        };

        jest.clearAllMocks();
    });

    describe('GET /api/payslips/my-history', () => {
        it('should return payslip history for logged-in user', async () => {
            const payslip1 = { ...mockPayslip };
            const payslip2 = { ...mockPayslip, payPeriod: '2025-08' };
            delete payslip1.save;
            delete payslip2.save;
            const mockPayslips = [payslip1, payslip2];

            mockPayslipService.getPayslipHistory.mockResolvedValue(mockPayslips);

            const response = await request(app).get('/api/payslips/my-history');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockPayslips);
            expect(mockPayslipService.getPayslipHistory).toHaveBeenCalled();
        });

        it('should handle errors when fetching payslip history', async () => {
            mockPayslipService.getPayslipHistory.mockRejectedValue(new Error('Database error'));

            const response = await request(app).get('/api/payslips/my-history');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error fetching payslip history');
        });
    });

    describe('GET /api/payslips/me', () => {
        it('should return current user draft payslip', async () => {
            const responsePayslip = { ...mockPayslip };
            delete responsePayslip.save;
            mockPayslipService.getDraftPayslip.mockResolvedValue(responsePayslip);

            const response = await request(app).get('/api/payslips/me');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(responsePayslip);
            expect(mockPayslipService.getDraftPayslip).toHaveBeenCalled();
        });

        it('should return null if no draft payslip exists', async () => {
            mockPayslipService.getDraftPayslip.mockResolvedValue(null);

            const response = await request(app).get('/api/payslips/me');

            expect(response.status).toBe(200);
            expect(response.body).toBeNull();
        });

        it('should handle service errors', async () => {
            mockPayslipService.getDraftPayslip.mockRejectedValue(new Error('Service error'));

            const response = await request(app).get('/api/payslips/me');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error fetching payslip');
        });
    });

    describe('POST /api/payslips/generate', () => {
        it('should generate new draft payslip', async () => {
            const responsePayslip = { ...mockPayslip, save: undefined };
            mockPayslipService.getDraftPayslip.mockResolvedValue(null);
            mockPayslipService.getOrCreateDraftPayslip.mockResolvedValue(responsePayslip);

            const response = await request(app).post('/api/payslips/generate');

            expect(response.status).toBe(201);
            expect(response.body).toEqual(responsePayslip);
            expect(mockPayslipService.getOrCreateDraftPayslip).toHaveBeenCalled();
        });

        it('should return 400 if payslip already exists for period', async () => {
            mockPayslipService.getDraftPayslip.mockResolvedValue(mockPayslip);

            const response = await request(app).post('/api/payslips/generate');

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Payslip already exists for this period');
        });

        it('should handle service errors during generation', async () => {
            mockPayslipService.getDraftPayslip.mockRejectedValue(new Error('Service error'));

            const response = await request(app).post('/api/payslips/generate');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error generating payslip');
        });
    });

    describe('GET /api/payslips/preapproved-items', () => {
        it('should return preapproved items', async () => {
            const mockItems = [
                { description: 'Item 1', amount: 100 },
                { description: 'Item 2', amount: 200 }
            ];
            mockPayslipService.getPreapprovedItems.mockResolvedValue(mockItems);

            const response = await request(app).get('/api/payslips/preapproved-items');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockItems);
        });

        it('should return empty array if no items found', async () => {
            mockPayslipService.getPreapprovedItems.mockResolvedValue(null);

            const response = await request(app).get('/api/payslips/preapproved-items');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should handle service errors', async () => {
            mockPayslipService.getPreapprovedItems.mockRejectedValue(new Error('Service error'));

            const response = await request(app).get('/api/payslips/preapproved-items');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error fetching pre-approved items');
        });
    });

    describe('GET /api/payslips/:id', () => {
        it('should return payslip for owner', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const responsePayslip = {
                ...mockPayslip,
                userId: { toHexString: () => MOCK_USER_ID },
                save: undefined
            };
            mockPayslipService.getPayslipById.mockResolvedValue(responsePayslip);

            const response = await request(app).get(`/api/payslips/${payslipId}`);

            expect(response.status).toBe(200);
            // The response body will have functions stripped out during JSON serialization
            expect(response.body).toMatchObject({
                _id: expect.any(String),
                payPeriod: '2025-09',
                status: 'Draft',
                earnings: [],
                bonuses: [],
                miscEarnings: [],
                deductions: [],
                notes: [],
                grossEarnings: 1000,
                totalDeductions: 100,
                paye: 50,
                uif: 10,
                netPay: 840
            });
        });

        it('should return null if payslip not found', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            mockPayslipService.getPayslipById.mockResolvedValue(null);

            const response = await request(app).get(`/api/payslips/${payslipId}`);

            expect(response.status).toBe(200);
            expect(response.body).toBeNull();
        });

        it('should return 403 for unauthorized user without management permission', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const otherUserId = new Types.ObjectId().toHexString();
            const otherUserPayslip = {
                ...mockPayslip,
                userId: { toHexString: () => otherUserId },
                save: undefined
            };
            mockPayslipService.getPayslipById.mockResolvedValue(otherUserPayslip);
            mockUserService.getUser.mockResolvedValue({
                permissions: [EPermission.CAN_VIEW_OWN_PAYSLIP]
            });

            const response = await request(app).get(`/api/payslips/${payslipId}`);

            expect(response.status).toBe(403);
        });
    });

    describe('PUT /api/payslips/:id/status', () => {
        it('should update payslip status', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const updatedPayslip = { ...mockPayslip, status: EPayslipStatus.LOCKED, save: undefined };
            mockPayslipService.updatePayslipStatus.mockResolvedValue(updatedPayslip);

            const response = await request(app)
                .put(`/api/payslips/${payslipId}/status`)
                .send({ status: EPayslipStatus.LOCKED });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedPayslip);
            expect(mockPayslipService.updatePayslipStatus).toHaveBeenCalledWith(
                expect.any(Types.ObjectId),
                EPayslipStatus.LOCKED,
                expect.any(Types.ObjectId)
            );
        });

        it('should handle service errors during status update', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            mockPayslipService.updatePayslipStatus.mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .put(`/api/payslips/${payslipId}/status`)
                .send({ status: EPayslipStatus.LOCKED });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error updating payslip status');
        });
    });

    describe('POST /api/payslips/:id/bonuses', () => {
        it('should add bonus to draft payslip', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const updatedPayslip = { ...mockPayslip, bonuses: [{ description: 'Performance Bonus', amount: 500 }], save: undefined };
            mockPayslipService.getPayslipById.mockResolvedValue(mockPayslip);
            mockPayslipService.addBonus.mockResolvedValue(updatedPayslip);

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/bonuses`)
                .send({ description: 'Performance Bonus', amount: 500 });

            expect(response.status).toBe(200);
            expect(mockPayslipService.addBonus).toHaveBeenCalledWith(
                expect.any(Types.ObjectId),
                'Performance Bonus',
                500
            );
        });

        it('should return 400 for missing required fields', async () => {
            const payslipId = new Types.ObjectId().toHexString();

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/bonuses`)
                .send({ description: 'Incomplete' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('description and amount are required');
        });

        it('should return 404 if payslip not found', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            mockPayslipService.getPayslipById.mockResolvedValue(null);

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/bonuses`)
                .send({ description: 'Performance Bonus', amount: 500 });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Payslip not found');
        });

        it('should return 400 for non-draft payslips', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const lockedPayslip = { ...mockPayslip, status: EPayslipStatus.LOCKED };
            mockPayslipService.getPayslipById.mockResolvedValue(lockedPayslip);
            mockPayslipService.addBonus.mockRejectedValue(new Error('Can only modify draft payslips'));

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/bonuses`)
                .send({ description: 'Performance Bonus', amount: 500 });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error adding bonus');
        });

        it('should return 403 for unauthorized user', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const otherUserPayslip = { ...mockPayslip, userId: new Types.ObjectId().toHexString() };
            mockPayslipService.getPayslipById.mockResolvedValue(otherUserPayslip);

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/bonuses`)
                .send({ description: 'Performance Bonus', amount: 500 });

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Unauthorized');
        });
    });

    describe('DELETE /api/payslips/:id/bonuses/:bonusIndex', () => {
        it('should remove bonus from payslip', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const payslipWithBonus = {
                ...mockPayslip,
                bonuses: [{ description: 'Performance Bonus', amount: 500 }]
            };
            const updatedPayslip = { ...payslipWithBonus, bonuses: [], save: undefined };
            mockPayslipService.getPayslipById.mockResolvedValue(payslipWithBonus);
            mockPayslipService.removeBonus.mockResolvedValue(updatedPayslip);

            const response = await request(app)
                .delete(`/api/payslips/${payslipId}/bonuses/0`);

            expect(response.status).toBe(200);
            expect(mockPayslipService.removeBonus).toHaveBeenCalledWith(
                expect.any(Types.ObjectId),
                0
            );
        });

        it('should return 400 for invalid bonus index', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            mockPayslipService.getPayslipById.mockResolvedValue(mockPayslip);
            mockPayslipService.removeBonus.mockRejectedValue(new Error('Invalid bonus index'));

            const response = await request(app)
                .delete(`/api/payslips/${payslipId}/bonuses/999`);

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error removing bonus');
        });
    });

    describe('POST /api/payslips/:id/deductions', () => {
        it('should add deduction to draft payslip', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const updatedPayslip = { ...mockPayslip, deductions: [{ description: 'Medical Aid', amount: 200 }], save: undefined };
            mockPayslipService.getPayslipById.mockResolvedValue(mockPayslip);
            mockPayslipService.addDeduction.mockResolvedValue(updatedPayslip);

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/deductions`)
                .send({ description: 'Medical Aid', amount: 200 });

            expect(response.status).toBe(200);
            expect(mockPayslipService.addDeduction).toHaveBeenCalledWith(
                expect.any(Types.ObjectId),
                'Medical Aid',
                200
            );
        });

        it('should return 400 for missing required fields', async () => {
            const payslipId = new Types.ObjectId().toHexString();

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/deductions`)
                .send({ description: 'Incomplete' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('description and amount are required');
        });
    });

    describe('POST /api/payslips/:id/misc-earnings', () => {
        it('should add misc earning to draft payslip', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const updatedPayslip = { ...mockPayslip, miscEarnings: [{ description: 'Overtime', amount: 300 }], save: undefined };
            mockPayslipService.getPayslipById.mockResolvedValue(mockPayslip);
            mockPayslipService.addMiscEarning.mockResolvedValue(updatedPayslip);

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/misc-earnings`)
                .send({ description: 'Overtime', amount: 300 });

            expect(response.status).toBe(200);
            expect(mockPayslipService.addMiscEarning).toHaveBeenCalledWith(
                expect.any(Types.ObjectId),
                'Overtime',
                300
            );
        });

        it('should return 400 for missing required fields', async () => {
            const payslipId = new Types.ObjectId().toHexString();

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/misc-earnings`)
                .send({ description: 'Incomplete' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('description and amount are required');
        });
    });

    describe('POST /api/payslips/:id/query', () => {
        it('should add query note to payslip', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const updatedPayslip = {
                ...mockPayslip,
                notes: [{
                    itemId: 'item123',
                    note: 'Please clarify this item',
                    resolved: false
                }],
                save: undefined
            };
            mockPayslipService.getPayslipById.mockResolvedValue(mockPayslip);
            mockPayslipService.addQueryNote.mockResolvedValue(updatedPayslip);

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/query`)
                .send({ itemId: 'item123', note: 'Please clarify this item' });

            expect(response.status).toBe(200);
            expect(mockPayslipService.addQueryNote).toHaveBeenCalledWith(
                expect.any(Types.ObjectId),
                'item123',
                'Please clarify this item'
            );
        });

        it('should return 400 for missing required fields', async () => {
            const payslipId = new Types.ObjectId().toHexString();

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/query`)
                .send({ itemId: 'item123' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('itemId and note are required');
        });

        it('should return 404 if payslip not found', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            mockPayslipService.getPayslipById.mockResolvedValue(null);

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/query`)
                .send({ itemId: 'item123', note: 'Please clarify this item' });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Payslip not found');
        });

        it('should return 403 for unauthorized user without management permission', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            const otherUserPayslip = { ...mockPayslip, userId: new Types.ObjectId().toHexString() };
            mockPayslipService.getPayslipById.mockResolvedValue(otherUserPayslip);
            mockUserService.getUser.mockResolvedValue({
                permissions: [EPermission.CAN_VIEW_OWN_PAYSLIP]
            });

            const response = await request(app)
                .post(`/api/payslips/${payslipId}/query`)
                .send({ itemId: 'item123', note: 'Please clarify this item' });

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Unauthorized');
        });
    });
});