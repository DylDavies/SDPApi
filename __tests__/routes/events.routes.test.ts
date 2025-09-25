import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { Types } from 'mongoose';

const mockEventService = {
    createEvent: jest.fn(),
    getEvents: jest.fn(),
    rateEvent: jest.fn(),
};

jest.mock('../../src/app/models/classes/Singleton', () => ({
    Singleton: {
        getInstance: jest.fn().mockImplementation((serviceClass: any) => {
            if (serviceClass.name === 'EventService') {
                return mockEventService;
            }
            return {};
        })
    }
}));

jest.mock('../../src/app/middleware/auth.middleware', () => ({
    authenticationMiddleware: jest.fn((req: Request, res: Response, next: NextFunction) => {
        (req as any).user = {
            id: new Types.ObjectId().toHexString(),
            email: 'test@tutor.com',
            displayName: 'Test User',
            type: EUserType.Admin,
        };
        next();
    })
}));

const app = express();
app.use(express.json());
const eventsRouter = require('../../src/app/routes/events/router').default;
app.use('/api/events', eventsRouter);


describe('Events Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/events', () => {
        it('should get all events for the current user', async () => {
            const mockEvents = [{ _id: new Types.ObjectId().toHexString(), subject: 'Math' }];
            mockEventService.getEvents.mockResolvedValue(mockEvents);

            const response = await request(app).get('/api/events');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockEvents);
            expect(mockEventService.getEvents).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /api/events', () => {
        it('should create a new event', async () => {
            const eventData = {
                bundleId: new Types.ObjectId().toHexString(),
                studentId: new Types.ObjectId().toHexString(),
                subject: 'Math',
                startTime: new Date().toISOString(),
                duration: 60
            };
            const createdEvent = { ...eventData, _id: new Types.ObjectId().toHexString() };
            mockEventService.createEvent.mockResolvedValue(createdEvent);

            const response = await request(app)
                .post('/api/events')
                .send(eventData);

            expect(response.status).toBe(201);
            expect(response.body).toEqual(createdEvent);
        });
    });

    describe('PATCH /api/events/:eventId/rate', () => {
        it('should rate an event successfully', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const ratingData = { rating: 5 };
            const ratedEvent = { _id: eventId, rating: 5 };
            mockEventService.rateEvent.mockResolvedValue(ratedEvent);

            const response = await request(app)
                .patch(`/api/events/${eventId}/rate`)
                .send(ratingData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(ratedEvent);
        });
    });
});