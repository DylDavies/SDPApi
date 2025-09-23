import { RemarkService } from '../../src/app/services/RemarkService';
import MRemark from '../../src/app/db/models/MRemark.model';
import MRemarkTemplate from '../../src/app/db/models/MRemarkTemplate.model';
import MEvent from '../../src/app/db/models/MEvent.model';
import { mocked } from 'jest-mock';

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

            MRemarkTemplateMock.findOne.mockResolvedValue(mockTemplate as any);
            MEventMock.findById.mockResolvedValue({ remarked: false } as any);
            // Mock the static .create() method, just like in the UserService tests
            (MRemarkMock.create as jest.Mock).mockResolvedValue(createdRemark);
            MEventMock.findByIdAndUpdate.mockResolvedValue({} as any);

            const remark = await remarkService.createRemark(eventId, entries);

            expect(MRemarkMock.create).toHaveBeenCalledWith({
                event: eventId,
                entries,
                template: mockTemplate._id,
            });
            expect(MEventMock.findByIdAndUpdate).toHaveBeenCalledWith(eventId, { remarked: true, remark: createdRemark._id });
            expect(remark).toEqual(createdRemark);
        });
    });
});