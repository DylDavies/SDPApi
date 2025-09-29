import { ExtraWorkService } from '../../src/app/services/ExtraWorkService';
import MExtraWork, { EExtraWorkStatus } from '../../src/app/db/models/MExtraWork.model';
import { Types } from 'mongoose';
import { mocked } from 'jest-mock';

// Mock the Mongoose model for ExtraWork to isolate the service logic
jest.mock('../../src/app/db/models/MExtraWork.model');

const MExtraWorkMock = mocked(MExtraWork);

describe('ExtraWorkService', () => {
    let extraWorkService: ExtraWorkService;

    beforeEach(() => {
        // Clear all mock implementations and calls before each test
        MExtraWorkMock.mockClear();
        
        // Mock the constructor and save method for new instances
        MExtraWorkMock.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue(true),
        }) as any);

        extraWorkService = new ExtraWorkService();
    });

    // --- Test Suite for createExtraWork ---
    describe('createExtraWork', () => {
        it('should correctly create and save a new extra work document', async () => {
            const userId = new Types.ObjectId().toHexString();
            const studentId = new Types.ObjectId().toHexString();
            const commissionerId = new Types.ObjectId().toHexString();
            const workData = {
                workType: 'Tutoring Session',
                details: 'Covered advanced calculus topics.',
                remuneration: 150
            };

            await extraWorkService.createExtraWork(userId, studentId, commissionerId, workData.workType, workData.details, workData.remuneration);

            // Expect the MExtraWork constructor to be called with the correct data
            expect(MExtraWorkMock).toHaveBeenCalledWith({
                userId: new Types.ObjectId(userId),
                studentId: new Types.ObjectId(studentId),
                commissionerId: new Types.ObjectId(commissionerId),
                ...workData
            });
        });
    });

    // --- Test Suite for getExtraWork ---
    describe('getExtraWork', () => {
        it('should call find and populate the necessary fields', async () => {
            const mockExec = jest.fn().mockResolvedValue([]);
            const mockPopulate = jest.fn().mockReturnThis();
            MExtraWorkMock.find.mockReturnValue({
                populate: mockPopulate,
                exec: mockExec
            } as any);

            await extraWorkService.getExtraWork();

            expect(MExtraWorkMock.find).toHaveBeenCalled();
            expect(mockPopulate).toHaveBeenCalledWith('userId', 'displayName');
            expect(mockPopulate).toHaveBeenCalledWith('studentId', 'displayName');
            expect(mockPopulate).toHaveBeenCalledWith('commissionerId', 'displayName');
            expect(mockExec).toHaveBeenCalled();
        });
    });

    // --- Test Suite for completeExtraWork ---
    describe('completeExtraWork', () => {
        it('should call findByIdAndUpdate with the correct completion data', async () => {
            const workId = new Types.ObjectId().toHexString();
            const completionDate = new Date();
            MExtraWorkMock.findByIdAndUpdate.mockResolvedValue({ _id: workId } as any);

            await extraWorkService.completeExtraWork(workId, completionDate);

            expect(MExtraWorkMock.findByIdAndUpdate).toHaveBeenCalledWith(
                workId,
                { $set: { dateCompleted: completionDate, status: EExtraWorkStatus.Completed } },
                { new: true }
            );
        });
    });

    // --- Test Suite for setExtraWorkStatus ---
    describe('setExtraWorkStatus', () => {
        it('should call findByIdAndUpdate with the correct status', async () => {
            const workId = new Types.ObjectId().toHexString();
            const newStatus = EExtraWorkStatus.Completed;
            MExtraWorkMock.findByIdAndUpdate.mockResolvedValue({ _id: workId, status: newStatus } as any);

            await extraWorkService.setExtraWorkStatus(workId, newStatus);

            expect(MExtraWorkMock.findByIdAndUpdate).toHaveBeenCalledWith(
                workId,
                { $set: { status: newStatus } },
                { new: true }
            );
        });

        it('should handle approved status with payslip integration', async () => {
            const workId = new Types.ObjectId().toHexString();
            const newStatus = EExtraWorkStatus.Approved;

            // Mock the findById chain with populate
            const mockWork = {
                _id: workId,
                userId: new Types.ObjectId(),
                studentId: { displayName: 'Test Student' },
                workType: 'Tutoring Session',
                remuneration: 150,
                dateCompleted: new Date('2025-09-15'),
                status: EExtraWorkStatus.Completed
            };

            const mockPopulate = jest.fn().mockResolvedValue(mockWork);
            MExtraWorkMock.findById.mockReturnValue({
                populate: mockPopulate
            } as any);

            MExtraWorkMock.findByIdAndUpdate.mockResolvedValue({ _id: workId, status: newStatus } as any);

            // Mock PayslipService methods
            const PayslipService = require('../../src/app/services/PayslipService').default;
            const payslipId = new Types.ObjectId().toHexString();
            jest.spyOn(PayslipService, 'getOrCreateDraftPayslip').mockResolvedValue({ id: payslipId });
            jest.spyOn(PayslipService, 'addBonus').mockResolvedValue(undefined);

            await extraWorkService.setExtraWorkStatus(workId, newStatus);

            expect(MExtraWorkMock.findById).toHaveBeenCalledWith(workId);
            expect(mockPopulate).toHaveBeenCalledWith('studentId', 'displayName');
            expect(PayslipService.getOrCreateDraftPayslip).toHaveBeenCalled();
            expect(PayslipService.addBonus).toHaveBeenCalled();
            expect(MExtraWorkMock.findByIdAndUpdate).toHaveBeenCalledWith(
                workId,
                { $set: { status: newStatus } },
                { new: true }
            );
        });
    });

    // --- Test Suite for getExtraWorkForUser ---
    describe('getExtraWorkForUser', () => {
        it('should find work where the user is either the assignee or commissioner', async () => {
            const userId = new Types.ObjectId().toHexString();
            const userObjectId = new Types.ObjectId(userId);

            const mockExec = jest.fn().mockResolvedValue([]);
            const mockPopulate = jest.fn().mockReturnThis();
            MExtraWorkMock.find.mockReturnValue({
                populate: mockPopulate,
                exec: mockExec
            } as any);

            await extraWorkService.getExtraWorkForUser(userId);

            // Check that the find query correctly uses $or
            expect(MExtraWorkMock.find).toHaveBeenCalledWith({
                $or: [
                    { userId: userObjectId },
                    { commissionerId: userObjectId }
                ]
            });

            expect(mockPopulate).toHaveBeenCalledWith('studentId', 'displayName');
            expect(mockPopulate).toHaveBeenCalledWith('commissionerId', 'displayName');
            expect(mockExec).toHaveBeenCalled();
        });
    });
});
