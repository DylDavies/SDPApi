import { PayslipService } from '../../src/app/services/PayslipService';
import { MPayslip } from '../../src/app/db/models/MPayslip.model';
import { MPreapprovedItems } from '../../src/app/db/models/MPreapprovedItems.model';
import { EPayslipStatus } from '../../src/app/models/enums/EPayslipStatus.enum';
import { Types } from 'mongoose';

// Mock MongoDB models
jest.mock('../../src/app/db/models/MPayslip.model');
jest.mock('../../src/app/db/models/MPreapprovedItems.model');
jest.mock('../../src/app/services/ConfigService', () => ({
    tax: {
        uifRate: 0.01,
        uifCeiling: 17712,
        primaryRebate: 17820,
        taxBrackets: [
            { upTo: 95750, rate: 0.18 },
            { upTo: 148217, rate: 0.26 },
            { upTo: 237100, rate: 0.31 },
            { upTo: 370500, rate: 0.36 },
            { upTo: 512800, rate: 0.39 },
            { upTo: 673000, rate: 0.41 },
            { upTo: Infinity, rate: 0.45 }
        ]
    }
}));

const MockedMPayslip = MPayslip as jest.Mocked<typeof MPayslip>;
const MockedMPreapprovedItems = MPreapprovedItems as jest.Mocked<typeof MPreapprovedItems>;

describe('PayslipService', () => {
    let payslipService: PayslipService;
    let mockPayslip: any;
    let mockUserId: Types.ObjectId;

    beforeEach(() => {
        payslipService = new PayslipService();
        mockUserId = new Types.ObjectId();

        mockPayslip = {
            _id: new Types.ObjectId(),
            userId: mockUserId,
            payPeriod: '2025-09',
            status: EPayslipStatus.DRAFT,
            earnings: [],
            bonuses: [],
            miscEarnings: [],
            deductions: [],
            grossEarnings: 0,
            totalDeductions: 0,
            paye: 0,
            uif: 0,
            netPay: 0,
            history: [],
            notes: [],
            save: jest.fn().mockResolvedValue(undefined),
        };

        jest.clearAllMocks();
    });

    describe('getOrCreateDraftPayslip', () => {
        it('should return existing draft payslip if it exists', async () => {
            MockedMPayslip.findOne.mockResolvedValue(mockPayslip);

            const result = await payslipService.getOrCreateDraftPayslip(mockUserId, '2025-09');

            expect(MockedMPayslip.findOne).toHaveBeenCalledWith({
                userId: mockUserId,
                payPeriod: '2025-09',
                status: EPayslipStatus.DRAFT
            });
            expect(result).toEqual(mockPayslip);
        });

        it('should create new draft payslip if none exists', async () => {
            MockedMPayslip.findOne.mockResolvedValue(null);
            const mockNewPayslip = { ...mockPayslip, save: jest.fn().mockResolvedValue(undefined) };
            (MockedMPayslip as any).mockImplementation(() => mockNewPayslip as any);

            const result = await payslipService.getOrCreateDraftPayslip(mockUserId, '2025-09');

            expect(MockedMPayslip.findOne).toHaveBeenCalledWith({
                userId: mockUserId,
                payPeriod: '2025-09',
                status: EPayslipStatus.DRAFT
            });
            expect(mockNewPayslip.save).toHaveBeenCalled();
            expect(result).toEqual(mockNewPayslip);
        });
    });

    describe('getDraftPayslip', () => {
        it('should return draft payslip without creating one', async () => {
            MockedMPayslip.findOne.mockResolvedValue(mockPayslip);

            const result = await payslipService.getDraftPayslip(mockUserId, '2025-09');

            expect(MockedMPayslip.findOne).toHaveBeenCalledWith({
                userId: mockUserId,
                payPeriod: '2025-09',
                status: EPayslipStatus.DRAFT
            });
            expect(result).toEqual(mockPayslip);
        });

        it('should return null if no draft payslip exists', async () => {
            MockedMPayslip.findOne.mockResolvedValue(null);

            const result = await payslipService.getDraftPayslip(mockUserId, '2025-09');

            expect(result).toBeNull();
        });
    });

    describe('getPayslipById', () => {
        it('should return payslip by ID', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            MockedMPayslip.findOne.mockResolvedValue(mockPayslip);

            const result = await payslipService.getPayslipById(payslipId);

            expect(MockedMPayslip.findOne).toHaveBeenCalledWith({
                _id: new Types.ObjectId(payslipId)
            });
            expect(result).toEqual(mockPayslip);
        });

        it('should return null if payslip not found', async () => {
            const payslipId = new Types.ObjectId().toHexString();
            MockedMPayslip.findOne.mockResolvedValue(null);

            const result = await payslipService.getPayslipById(payslipId);

            expect(result).toBeNull();
        });
    });

    describe('updatePayslipStatus', () => {
        it('should update payslip status and add history entry', async () => {
            const payslipId = new Types.ObjectId();
            const updatedById = new Types.ObjectId();
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            const result = await payslipService.updatePayslipStatus(
                payslipId,
                EPayslipStatus.LOCKED,
                updatedById
            );

            expect(MockedMPayslip.findById).toHaveBeenCalledWith(payslipId);
            expect(mockPayslip.status).toBe(EPayslipStatus.LOCKED);
            expect(mockPayslip.history).toHaveLength(1);
            expect(mockPayslip.history[0].status).toBe(EPayslipStatus.LOCKED);
            expect(mockPayslip.history[0].updatedBy).toBe(updatedById);
            expect(mockPayslip.save).toHaveBeenCalled();
            expect(result).toEqual(mockPayslip);
        });

        it('should throw error if payslip not found', async () => {
            const payslipId = new Types.ObjectId();
            const updatedById = new Types.ObjectId();
            MockedMPayslip.findById.mockResolvedValue(null);

            await expect(
                payslipService.updatePayslipStatus(payslipId, EPayslipStatus.LOCKED, updatedById)
            ).rejects.toThrow('Payslip not found');
        });
    });

    describe('addCompletedEvent', () => {
        it('should add new event to payslip if it does not exist', async () => {
            const eventDate = new Date('2025-09-15');
            const payload = {
                userId: mockUserId,
                eventDate,
                description: 'Tutoring Session',
                quantity: 2,
                rate: 150
            };

            mockPayslip.earnings = [];
            MockedMPayslip.findOne.mockResolvedValue(mockPayslip);
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);
            MockedMPayslip.find.mockResolvedValue([]); // Mock for tax calculation

            await payslipService.addCompletedEvent(payload);

            expect(mockPayslip.earnings).toHaveLength(1);
            expect(mockPayslip.earnings[0]).toMatchObject({
                description: 'Tutoring Session on 2025-09-15',
                hours: 2,
                rate: 150,
                total: 300,
                date: '2025-09-15'
            });
            expect(mockPayslip.save).toHaveBeenCalled();
        });

        it('should not add duplicate events', async () => {
            const eventDate = new Date('2025-09-15');
            const payload = {
                userId: mockUserId,
                eventDate,
                description: 'Tutoring Session',
                quantity: 2,
                rate: 150
            };

            mockPayslip.earnings = [{
                description: 'Tutoring Session on 2025-09-15',
                hours: 2,
                rate: 150,
                total: 300,
                date: '2025-09-15'
            }];
            MockedMPayslip.findOne.mockResolvedValue(mockPayslip);
            MockedMPayslip.find.mockResolvedValue([]); // Mock for tax calculation

            await payslipService.addCompletedEvent(payload);

            expect(mockPayslip.earnings).toHaveLength(1);
            expect(mockPayslip.save).not.toHaveBeenCalled();
        });
    });

    describe('recalculatePayslip', () => {
        beforeEach(() => {
            MockedMPayslip.find.mockResolvedValue([]); // No previous payslips for tax calculation
        });

        it('should recalculate all payslip totals correctly', async () => {
            const payslipId = new Types.ObjectId();

            mockPayslip.earnings = [
                { total: 1000 },
                { total: 500 }
            ];
            mockPayslip.bonuses = [
                { amount: 200 }
            ];
            mockPayslip.miscEarnings = [
                { amount: 100 }
            ];
            mockPayslip.deductions = [
                { amount: 50 },
                { amount: 30 }
            ];

            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            const result = await payslipService.recalculatePayslip(payslipId);

            expect(mockPayslip.grossEarnings).toBe(1500); // 1000 + 500
            expect(mockPayslip.totalDeductions).toBe(80); // 50 + 30
            expect(mockPayslip.save).toHaveBeenCalled();
            expect(result).toEqual(mockPayslip);
        });

        it('should throw error if payslip not found', async () => {
            const payslipId = new Types.ObjectId();
            MockedMPayslip.findById.mockResolvedValue(null);

            await expect(
                payslipService.recalculatePayslip(payslipId)
            ).rejects.toThrow('Payslip not found');
        });

        it('should handle missing bonuses and miscEarnings arrays', async () => {
            const payslipId = new Types.ObjectId();

            mockPayslip.earnings = [{ total: 1000 }];
            mockPayslip.bonuses = undefined;
            mockPayslip.miscEarnings = undefined;
            mockPayslip.deductions = [{ amount: 50 }];

            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            const result = await payslipService.recalculatePayslip(payslipId);

            expect(mockPayslip.grossEarnings).toBe(1000);
            expect(mockPayslip.totalDeductions).toBe(50);
            expect(result).toEqual(mockPayslip);
        });
    });

    describe('getPreapprovedItems', () => {
        it('should return all preapproved items', async () => {
            const mockItems = [
                { description: 'Item 1', amount: 100 },
                { description: 'Item 2', amount: 200 }
            ];
            MockedMPreapprovedItems.find.mockResolvedValue(mockItems);

            const result = await payslipService.getPreapprovedItems();

            expect(MockedMPreapprovedItems.find).toHaveBeenCalled();
            expect(result).toEqual(mockItems);
        });

        it('should return null if no items found', async () => {
            MockedMPreapprovedItems.find.mockResolvedValue(null as any);

            const result = await payslipService.getPreapprovedItems();

            expect(result).toBeNull();
        });
    });

    describe('tax calculations', () => {
        it('should calculate UIF correctly for earnings below ceiling', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.earnings = [{ total: 10000 }];
            mockPayslip.bonuses = [];
            mockPayslip.miscEarnings = [];
            mockPayslip.deductions = [];

            MockedMPayslip.findById.mockResolvedValue(mockPayslip);
            MockedMPayslip.find.mockResolvedValue([]);

            await payslipService.recalculatePayslip(payslipId);

            expect(mockPayslip.uif).toBe(100); // 10000 * 0.01
        });

        it('should cap UIF calculation at earnings ceiling', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.earnings = [{ total: 20000 }]; // Above UIF ceiling
            mockPayslip.bonuses = [];
            mockPayslip.miscEarnings = [];
            mockPayslip.deductions = [];

            MockedMPayslip.findById.mockResolvedValue(mockPayslip);
            MockedMPayslip.find.mockResolvedValue([]);

            await payslipService.recalculatePayslip(payslipId);

            expect(mockPayslip.uif).toBe(177.12); // 17712 * 0.01
        });
    });

    describe('service initialization', () => {
        it('should have correct service properties', () => {
            expect(payslipService.serviceName).toBe('PayslipService');
            expect(payslipService.loadPriority).toBeDefined();
        });

        it('should have init and initialize methods', async () => {
            await expect(payslipService.init()).resolves.toBeUndefined();
            await expect(payslipService.initialize()).resolves.toBeUndefined();
        });
    });
});