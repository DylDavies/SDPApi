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
                payPeriod: '2025-09'
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

    describe('getPayslip', () => {
        it('should return payslip without creating one', async () => {
            MockedMPayslip.findOne.mockResolvedValue(mockPayslip);

            const result = await payslipService.getPayslip(mockUserId, '2025-09');

            expect(MockedMPayslip.findOne).toHaveBeenCalledWith({
                userId: mockUserId,
                payPeriod: '2025-09'
            });
            expect(result).toEqual(mockPayslip);
        });

        it('should return null if no payslip exists', async () => {
            MockedMPayslip.findOne.mockResolvedValue(null);

            const result = await payslipService.getPayslip(mockUserId, '2025-09');

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
                rate: 150,
                baseRate: 100
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
                total: 400,
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
                rate: 150,
                baseRate: 100
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

    describe('getPayslipHistory', () => {
        it('should return payslip history sorted by pay period', async () => {
            const mockHistory = [
                { ...mockPayslip, payPeriod: '2025-10' },
                { ...mockPayslip, payPeriod: '2025-09' }
            ];
            MockedMPayslip.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockHistory)
            } as any);

            const result = await payslipService.getPayslipHistory(mockUserId);

            expect(MockedMPayslip.find).toHaveBeenCalledWith({ userId: mockUserId });
            expect(result).toEqual(mockHistory);
        });
    });

    describe('addQueryNote', () => {
        it('should add a query note to payslip', async () => {
            const payslipId = new Types.ObjectId();
            const itemId = 'item-123';
            const note = 'Query about this earning';
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.addQueryNote(payslipId, itemId, note);

            expect(mockPayslip.notes).toHaveLength(1);
            expect(mockPayslip.notes[0]).toMatchObject({
                itemId,
                note,
                resolved: false
            });
            expect(mockPayslip.save).toHaveBeenCalled();
        });

        it('should throw error if payslip not found', async () => {
            const payslipId = new Types.ObjectId();
            MockedMPayslip.findById.mockResolvedValue(null);

            await expect(
                payslipService.addQueryNote(payslipId, 'item-123', 'note')
            ).rejects.toThrow('Payslip not found');
        });
    });

    describe('updateQueryNote', () => {
        it('should update an existing query note', async () => {
            const payslipId = new Types.ObjectId();
            const queryId = new Types.ObjectId();
            const updatedNote = 'Updated query note';
            mockPayslip.notes = [
                { _id: queryId, itemId: 'item-123', note: 'Old note', resolved: false }
            ];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.updateQueryNote(payslipId, queryId.toString(), updatedNote);

            expect(mockPayslip.notes[0].note).toBe(updatedNote);
            expect(mockPayslip.save).toHaveBeenCalled();
        });

        it('should throw error if query not found', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.notes = [];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await expect(
                payslipService.updateQueryNote(payslipId, 'invalid-id', 'note')
            ).rejects.toThrow('Query not found');
        });
    });

    describe('deleteQueryNote', () => {
        it('should delete a query note', async () => {
            const payslipId = new Types.ObjectId();
            const queryId = new Types.ObjectId();
            mockPayslip.notes = [
                { _id: queryId, itemId: 'item-123', note: 'Note', resolved: false }
            ];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.deleteQueryNote(payslipId, queryId.toString());

            expect(mockPayslip.notes).toHaveLength(0);
            expect(mockPayslip.save).toHaveBeenCalled();
        });

        it('should throw error if query not found', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.notes = [];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await expect(
                payslipService.deleteQueryNote(payslipId, 'invalid-id')
            ).rejects.toThrow('Query not found');
        });
    });

    describe('resolveQueryNote', () => {
        it('should mark a query note as resolved', async () => {
            const payslipId = new Types.ObjectId();
            const queryId = new Types.ObjectId();
            mockPayslip.notes = [
                { _id: queryId, itemId: 'item-123', note: 'Note', resolved: false }
            ];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.resolveQueryNote(payslipId, queryId.toString());

            expect(mockPayslip.notes[0].resolved).toBe(true);
            expect(mockPayslip.save).toHaveBeenCalled();
        });

        it('should throw error if query not found', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.notes = [];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await expect(
                payslipService.resolveQueryNote(payslipId, 'invalid-id')
            ).rejects.toThrow('Query not found');
        });
    });

    describe('addBonus', () => {
        beforeEach(() => {
            MockedMPayslip.find.mockResolvedValue([]);
        });

        it('should add a bonus to draft payslip and recalculate', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.bonuses = [];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.addBonus(payslipId, 'Performance Bonus', 1000);

            expect(mockPayslip.bonuses).toHaveLength(1);
            expect(mockPayslip.bonuses[0]).toMatchObject({
                description: 'Performance Bonus',
                amount: 1000
            });
            expect(mockPayslip.save).toHaveBeenCalled();
        });

        it('should throw error if payslip is not draft', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.status = EPayslipStatus.LOCKED;
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await expect(
                payslipService.addBonus(payslipId, 'Bonus', 500)
            ).rejects.toThrow('Can only modify draft payslips');
        });
    });

    describe('removeBonus', () => {
        beforeEach(() => {
            MockedMPayslip.find.mockResolvedValue([]);
        });

        it('should remove a bonus from draft payslip', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.bonuses = [
                { description: 'Bonus 1', amount: 500 },
                { description: 'Bonus 2', amount: 300 }
            ];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.removeBonus(payslipId, 0);

            expect(mockPayslip.bonuses).toHaveLength(1);
            expect(mockPayslip.bonuses[0].description).toBe('Bonus 2');
        });

        it('should throw error for invalid bonus index', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.bonuses = [{ description: 'Bonus', amount: 500 }];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await expect(
                payslipService.removeBonus(payslipId, 5)
            ).rejects.toThrow('Invalid bonus index');
        });
    });

    describe('addDeduction', () => {
        beforeEach(() => {
            MockedMPayslip.find.mockResolvedValue([]);
        });

        it('should add a deduction to draft payslip', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.deductions = [];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.addDeduction(payslipId, 'Medical Aid', 150);

            expect(mockPayslip.deductions).toHaveLength(1);
            expect(mockPayslip.deductions[0]).toMatchObject({
                description: 'Medical Aid',
                amount: 150
            });
        });

        it('should initialize deductions array if undefined', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.deductions = undefined;
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.addDeduction(payslipId, 'Deduction', 100);

            expect(Array.isArray(mockPayslip.deductions)).toBe(true);
            expect(mockPayslip.deductions).toHaveLength(1);
        });
    });

    describe('updateDeduction', () => {
        beforeEach(() => {
            MockedMPayslip.find.mockResolvedValue([]);
        });

        it('should update an existing deduction', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.deductions = [
                { description: 'Old Deduction', amount: 100 }
            ];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.updateDeduction(payslipId, 0, 'Updated Deduction', 200);

            expect(mockPayslip.deductions[0]).toMatchObject({
                description: 'Updated Deduction',
                amount: 200
            });
        });

        it('should throw error for invalid deduction index', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.deductions = [{ description: 'Deduction', amount: 100 }];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await expect(
                payslipService.updateDeduction(payslipId, 10, 'New', 50)
            ).rejects.toThrow('Invalid deduction index');
        });
    });

    describe('removeDeduction', () => {
        beforeEach(() => {
            MockedMPayslip.find.mockResolvedValue([]);
        });

        it('should remove a deduction from payslip', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.deductions = [
                { description: 'Deduction 1', amount: 100 },
                { description: 'Deduction 2', amount: 50 }
            ];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.removeDeduction(payslipId, 0);

            expect(mockPayslip.deductions).toHaveLength(1);
            expect(mockPayslip.deductions[0].description).toBe('Deduction 2');
        });
    });

    describe('addMiscEarning', () => {
        beforeEach(() => {
            MockedMPayslip.find.mockResolvedValue([]);
        });

        it('should add a misc earning to draft payslip', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.miscEarnings = [];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.addMiscEarning(payslipId, 'Travel Allowance', 500);

            expect(mockPayslip.miscEarnings).toHaveLength(1);
            expect(mockPayslip.miscEarnings[0]).toMatchObject({
                description: 'Travel Allowance',
                amount: 500
            });
        });

        it('should initialize miscEarnings array if undefined', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.miscEarnings = undefined;
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.addMiscEarning(payslipId, 'Earning', 200);

            expect(Array.isArray(mockPayslip.miscEarnings)).toBe(true);
        });
    });

    describe('updateMiscEarning', () => {
        beforeEach(() => {
            MockedMPayslip.find.mockResolvedValue([]);
        });

        it('should update an existing misc earning', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.miscEarnings = [
                { description: 'Old Earning', amount: 100 }
            ];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.updateMiscEarning(payslipId, 0, 'Updated Earning', 300);

            expect(mockPayslip.miscEarnings[0]).toMatchObject({
                description: 'Updated Earning',
                amount: 300
            });
        });

        it('should throw error for invalid misc earning index', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.miscEarnings = [{ description: 'Earning', amount: 100 }];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await expect(
                payslipService.updateMiscEarning(payslipId, 5, 'New', 50)
            ).rejects.toThrow('Invalid misc earning index');
        });
    });

    describe('removeMiscEarning', () => {
        beforeEach(() => {
            MockedMPayslip.find.mockResolvedValue([]);
        });

        it('should remove a misc earning from payslip', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.miscEarnings = [
                { description: 'Earning 1', amount: 200 },
                { description: 'Earning 2', amount: 100 }
            ];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await payslipService.removeMiscEarning(payslipId, 1);

            expect(mockPayslip.miscEarnings).toHaveLength(1);
            expect(mockPayslip.miscEarnings[0].description).toBe('Earning 1');
        });

        it('should throw error for invalid misc earning index', async () => {
            const payslipId = new Types.ObjectId();
            mockPayslip.miscEarnings = [{ description: 'Earning', amount: 100 }];
            MockedMPayslip.findById.mockResolvedValue(mockPayslip);

            await expect(
                payslipService.removeMiscEarning(payslipId, 10)
            ).rejects.toThrow('Invalid misc earning index');
        });
    });
});