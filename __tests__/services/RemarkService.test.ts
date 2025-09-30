import { RemarkService } from '../../src/app/services/RemarkService';
import MRemark from '../../src/app/db/models/MRemark.model';
import MRemarkTemplate from '../../src/app/db/models/MRemarkTemplate.model';
import MEvent from '../../src/app/db/models/MEvent.model';
import { mocked } from 'jest-mock';
import { Types } from 'mongoose';

jest.mock('../../src/app/db/models/MRemark.model');
jest.mock('../../src/app/db/models/MRemarkTemplate.model');
jest.mock('../../src/app/db/models/MEvent.model');

const MRemarkMock = MRemark as jest.Mocked<typeof MRemark>;
const MRemarkTemplateMock = mocked(MRemarkTemplate);
const MEventMock = mocked(MEvent);

describe('RemarkService', () => {
    let remarkService: RemarkService;

    beforeEach(() => {
        jest.clearAllMocks();
        remarkService = new RemarkService();
    });

    describe('getActiveTemplate', () => {
        it('should return the active remark template', async () => {
            const mockTemplate = { name: 'Active Template', isActive: true };
            MRemarkTemplateMock.findOne.mockResolvedValue(mockTemplate as any);

            const template = await remarkService.getActiveTemplate();

            expect(template).toEqual(mockTemplate);
            expect(MRemarkTemplateMock.findOne).toHaveBeenCalledWith({ isActive: true });
        });
    });

    describe('createRemark', () => {
        it('should create a new remark for an event using MRemark.create', async () => {
            const eventId = 'some-event-id';
            const entries = [{ field: 'notes', value: 'Great progress!' }];
            const mockTemplate = { _id: 'template-id', name: 'Active Template', isActive: true };
            const createdRemark = { _id: 'new-remark-id', event: eventId, entries, template: mockTemplate._id };
            const mockEvent = {
                remarked: false,
                tutor: new Types.ObjectId(),
                duration: 120,
                startTime: new Date(),
                subject: 'Math',
                student: { displayName: 'Test Student' }
            };

            MRemarkTemplateMock.findOne.mockResolvedValue(mockTemplate as any);

            // Mock findById chain with populate
            const mockPopulate = jest.fn().mockResolvedValue(mockEvent);
            MEventMock.findById.mockReturnValue({
                populate: mockPopulate
            } as any);

            (MRemarkMock.create as jest.Mock).mockResolvedValue(createdRemark);
            MEventMock.findByIdAndUpdate.mockResolvedValue({} as any);

            // Mock UserService and PayslipService
            const UserService = require('../../src/app/services/UserService').default;
            const PayslipService = require('../../src/app/services/PayslipService').default;
            jest.spyOn(UserService, 'getUser').mockResolvedValue({
                rateAdjustments: [{ effectiveDate: new Date(), newRate: 200 }]
            });
            jest.spyOn(PayslipService, 'addCompletedEvent').mockResolvedValue(undefined);

            const remark = await remarkService.createRemark(eventId, entries);

            expect(MEventMock.findById).toHaveBeenCalledWith(eventId);
            expect(mockPopulate).toHaveBeenCalledWith('student', 'displayName');
            expect(MRemarkMock.create).toHaveBeenCalledWith({
                event: eventId,
                entries,
                template: mockTemplate._id,
            });
            expect(MEventMock.findByIdAndUpdate).toHaveBeenCalledWith(eventId, { remarked: true, remark: createdRemark._id });
            expect(PayslipService.addCompletedEvent).toHaveBeenCalled();
            expect(remark).toEqual(createdRemark);
        });

        it('should throw an error if the event has already been remarked', async () => {
            const eventId = 'some-event-id';
            const entries = [{ field: 'notes', value: 'Great progress!' }];
            const mockTemplate = { _id: 'template-id', name: 'Active Template', isActive: true };

            MRemarkTemplateMock.findOne.mockResolvedValue(mockTemplate as any);

            // Mock findById chain with populate for already remarked event
            const mockPopulate = jest.fn().mockResolvedValue({ remarked: true });
            MEventMock.findById.mockReturnValue({
                populate: mockPopulate
            } as any);

            await expect(remarkService.createRemark(eventId, entries))
                .rejects.toThrow("This event has already been remarked.");
        });
    });
    
    describe('updateTemplate', () => {
        it('should update the active template and create a new one', async () => {
            const newFields = [{ name: 'New Field', type: 'string' }];
            const mockTemplate = { name: 'New Template' };

            (MRemarkTemplate.updateMany as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
            (MRemarkTemplate.countDocuments as jest.Mock).mockResolvedValue(1);
            (MRemarkTemplate.create as jest.Mock).mockResolvedValue(mockTemplate);

            const result = await remarkService.updateTemplate(newFields as any);

            expect(MRemarkTemplate.updateMany).toHaveBeenCalledWith({ isActive: true }, { '$set': { isActive: false } });
            expect(MRemarkTemplate.create).toHaveBeenCalled();
            expect(result).toEqual(mockTemplate);
        });
    });

    describe('updateRemark', () => {
        it('should find and update a remark by its ID', async () => {
            const remarkId = new Types.ObjectId().toHexString();
            const entries = [{ field: 'updated notes', value: 'Even better progress!' }];
            const updatedRemark = { _id: remarkId, entries };
            
            (MRemarkMock.findByIdAndUpdate as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(updatedRemark),
            } as any);

            const result = await remarkService.updateRemark(remarkId, entries);

            expect(MRemarkMock.findByIdAndUpdate).toHaveBeenCalledWith(remarkId, { entries }, { new: true });
            expect(result).toEqual(updatedRemark);
        });
    });

    describe('getRemarkForEvent', () => {
        it('should find a remark by the event ID', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const mockRemark = { event: eventId, entries: [] };

            (MRemarkMock.findOne as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockRemark),
            } as any);

            const result = await remarkService.getRemarkForEvent(eventId);

            expect(MRemarkMock.findOne).toHaveBeenCalledWith({ event: eventId });
            expect(result).toEqual(mockRemark);
        });
    });
});