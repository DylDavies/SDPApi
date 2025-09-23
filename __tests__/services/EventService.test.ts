import { EventService } from '../../src/app/services/EventService';
import MEvent from '../../src/app/db/models/MEvent.model';
import MBundle from '../../src/app/db/models/MBundle.model';
import { Types } from 'mongoose';
import { mocked } from 'jest-mock';

jest.mock('../../src/app/db/models/MEvent.model');
jest.mock('../../src/app/db/models/MBundle.model');

const MEventMock = MEvent as jest.Mocked<typeof MEvent>;
const MBundleMock = MBundle as jest.Mocked<typeof MBundle>;

describe('EventService', () => {
    let eventService: EventService;

    beforeEach(() => {
        jest.clearAllMocks();
        eventService = new EventService();
    });

    describe('rateEvent', () => {
        it('should successfully rate an unrated event', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const mockEvent = { _id: eventId, rating: undefined };

            (MEventMock.findById as jest.Mock).mockResolvedValue(mockEvent);
            (MEventMock.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...mockEvent, rating: 5 });

            const result = await eventService.rateEvent(eventId, 5);

            expect(MEventMock.findById).toHaveBeenCalledWith(eventId);
            expect(MEventMock.findByIdAndUpdate).toHaveBeenCalledWith(eventId, { rating: 5 }, { new: true });
            expect(result?.rating).toBe(5);
        });

        it('should throw an error if the event has already been rated', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const mockEvent = { _id: eventId, rating: 4 }; // Already has a rating
            (MEventMock.findById as jest.Mock).mockResolvedValue(mockEvent);

            await expect(eventService.rateEvent(eventId, 5)).rejects.toThrow("This event has already been rated.");
        });
    });

    describe('createEvent', () => {
        const bundleId = new Types.ObjectId().toHexString();
        const studentId = new Types.ObjectId().toHexString();
        const tutorId = new Types.ObjectId().toHexString();

        it('should create an event and deduct time from the bundle', async () => {
            const mockBundle = {
                _id: bundleId,
                subjects: [{ subject: 'Math', durationMinutes: 120 }],
                save: jest.fn().mockResolvedValue(true),
            };
            (MBundleMock.findById as jest.Mock).mockResolvedValue(mockBundle);
            (MEventMock.create as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });

            await eventService.createEvent(bundleId, studentId, tutorId, 'Math', new Date(), 60);

            expect(MBundleMock.findById).toHaveBeenCalledWith(bundleId);
            expect(mockBundle.subjects[0].durationMinutes).toBe(60);
            expect(mockBundle.save).toHaveBeenCalledTimes(1);
            expect(MEventMock.create).toHaveBeenCalledTimes(1);
        });

        it('should throw an error if the bundle is not found', async () => {
            (MBundleMock.findById as jest.Mock).mockResolvedValue(null);

            await expect(eventService.createEvent(bundleId, studentId, tutorId, 'Math', new Date(), 60))
                .rejects.toThrow('Bundle not found.');
        });
    });

    describe('getEvents', () => {
        it('should retrieve events for a given user ID', async () => {
            const userId = new Types.ObjectId().toHexString();
            const mockEvents = [{ subject: 'Math' }, { subject: 'English' }];
            
            (MEventMock.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockEvents),
            } as any);

            const result = await eventService.getEvents(userId);

            expect(MEventMock.find).toHaveBeenCalledWith({ '$or': [{ tutor: userId }, { student: userId }] });
            expect(result).toEqual(mockEvents);
        });
    });

    describe('updateEvent', () => {
        it('should update an event and adjust the bundle duration', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const bundleId = new Types.ObjectId();
            const originalEvent = { _id: eventId, bundle: bundleId, subject: 'Math', duration: 60 };
            const eventData = { duration: 90, subject: 'Math' };
            const mockBundle = { 
                subjects: [{ subject: 'Math', durationMinutes: 500 }],
                save: jest.fn().mockResolvedValue(true),
            };

            (MEventMock.findById as jest.Mock).mockResolvedValue(originalEvent);
            (MBundleMock.findById as jest.Mock).mockResolvedValue(mockBundle);
            (MEventMock.findByIdAndUpdate as jest.Mock).mockResolvedValue({ ...originalEvent, ...eventData });

            const result = await eventService.updateEvent(eventId, eventData);

            expect(MEventMock.findById).toHaveBeenCalledWith(eventId);
            expect(MBundleMock.findById).toHaveBeenCalledWith(bundleId);
            expect(mockBundle.subjects[0].durationMinutes).toBe(470); // 500 + 60 - 90
            expect(mockBundle.save).toHaveBeenCalledTimes(1);
            expect(result?.duration).toBe(90);
        });
    });

    describe('deleteEvent', () => {
        it('should delete an event and refund the duration to the bundle', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const mockEvent = {
                _id: eventId,
                bundle: new Types.ObjectId(),
                subject: 'Math',
                duration: 60,
            };
            const mockBundle = {
                subjects: [{ subject: 'Math', durationMinutes: 60 }],
                save: jest.fn().mockResolvedValue(true),
            };

            (MEventMock.findByIdAndDelete as jest.Mock).mockResolvedValue(mockEvent);
            (MBundleMock.findById as jest.Mock).mockResolvedValue(mockBundle);

            await eventService.deleteEvent(eventId);

            expect(MEventMock.findByIdAndDelete).toHaveBeenCalledWith(eventId);
            expect(MBundleMock.findById).toHaveBeenCalledWith(mockEvent.bundle);
            expect(mockBundle.subjects[0].durationMinutes).toBe(120);
            expect(mockBundle.save).toHaveBeenCalledTimes(1);
        });
    });
});