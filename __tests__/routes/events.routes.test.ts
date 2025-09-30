import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import { Types } from 'mongoose';

const mockEventService = {
    createEvent: jest.fn(),
    getEvents: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
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

        it('should return 400 when rating event fails', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const ratingData = { rating: 5 };
            mockEventService.rateEvent.mockRejectedValue(new Error('Rating validation failed'));

            const response = await request(app)
                .patch(`/api/events/${eventId}/rate`)
                .send(ratingData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Error rating event');
            expect(response.body.error).toBe('Rating validation failed');
        });
    });

    describe('PATCH /api/events/:eventId', () => {
        it('should update an event successfully', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const updateData = { subject: 'Physics', duration: 90 };
            const updatedEvent = { _id: eventId, ...updateData };
            mockEventService.updateEvent.mockResolvedValue(updatedEvent);

            const response = await request(app)
                .patch(`/api/events/${eventId}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedEvent);
            expect(mockEventService.updateEvent).toHaveBeenCalledWith(eventId, updateData);
        });

        it('should return 404 when event not found', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const updateData = { subject: 'Physics' };
            mockEventService.updateEvent.mockResolvedValue(null);

            const response = await request(app)
                .patch(`/api/events/${eventId}`)
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found.');
        });

        it('should return 400 when update fails', async () => {
            const eventId = new Types.ObjectId().toHexString();
            const updateData = { subject: 'Physics' };
            mockEventService.updateEvent.mockRejectedValue(new Error('Invalid update data'));

            const response = await request(app)
                .patch(`/api/events/${eventId}`)
                .send(updateData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Error updating event');
            expect(response.body.error).toBe('Invalid update data');
        });
    });

    describe('DELETE /api/events/:eventId', () => {
        it('should delete an event successfully', async () => {
            const eventId = new Types.ObjectId().toHexString();
            mockEventService.deleteEvent.mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/events/${eventId}`);

            expect(response.status).toBe(204);
            expect(mockEventService.deleteEvent).toHaveBeenCalledWith(eventId);
        });

        it('should return 404 when event not found', async () => {
            const eventId = new Types.ObjectId().toHexString();
            mockEventService.deleteEvent.mockRejectedValue(new Error('Event not found.'));

            const response = await request(app).delete(`/api/events/${eventId}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Error deleting event');
            expect(response.body.error).toBe('Event not found.');
        });

        it('should return 400 for other delete errors', async () => {
            const eventId = new Types.ObjectId().toHexString();
            mockEventService.deleteEvent.mockRejectedValue(new Error('Database error'));

            const response = await request(app).delete(`/api/events/${eventId}`);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Error deleting event');
            expect(response.body.error).toBe('Database error');
        });
    });

    describe('GET /api/events - Error cases', () => {
        it('should return 500 when fetching events fails', async () => {
            mockEventService.getEvents.mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app).get('/api/events');

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error fetching events');
            expect(response.body.error).toBe('Database connection failed');
        });
    });

    describe('POST /api/events - Error cases', () => {
        it('should return 400 when creating event fails', async () => {
            const eventData = {
                bundleId: new Types.ObjectId().toHexString(),
                studentId: new Types.ObjectId().toHexString(),
                subject: 'Math',
                startTime: new Date().toISOString(),
                duration: 60
            };
            mockEventService.createEvent.mockRejectedValue(new Error('Invalid event data'));

            const response = await request(app)
                .post('/api/events')
                .send(eventData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Error creating event');
            expect(response.body.error).toBe('Invalid event data');
        });
    });
});