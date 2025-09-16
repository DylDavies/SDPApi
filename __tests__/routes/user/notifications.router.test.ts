import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import notificationsRouter from '../../../src/app/routes/user/notifications/router';
import NotificationService from '../../../src/app/services/NotificationService';
import IPayloadUser from '../../../src/app/models/interfaces/IPayloadUser.interface';
import { JwtPayload } from 'jsonwebtoken';

// Extend the Express Request type for our tests
declare global {
    namespace Express {
        interface Request {
            user?: IPayloadUser | JwtPayload | undefined;
        }
    }
}

// Mock the dependencies
jest.mock('../../../src/app/services/NotificationService');
jest.mock('../../../src/app/middleware/auth.middleware', () => ({
    // Mock the middleware to automatically call next() and attach a mock user
    authenticationMiddleware: (req: Request, res: Response, next: NextFunction) => {
        req.user = { id: 'testUserId123' } as IPayloadUser;
        next();
    },
}));

const app = express();
app.use(express.json());
app.use('/api/user/notifications', notificationsRouter);

describe('Notifications Router', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /', () => {
        it('should return 200 and a list of notifications', async () => {
            const mockNotifications = [{ title: 'Test' }];
            (NotificationService.getNotificationsForUser as jest.Mock).mockResolvedValue(mockNotifications);

            const response = await request(app).get('/api/user/notifications');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockNotifications);
            expect(NotificationService.getNotificationsForUser).toHaveBeenCalledWith('testUserId123');
        });

        it('should return 500 if the service throws an error', async () => {
            (NotificationService.getNotificationsForUser as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const response = await request(app).get('/api/user/notifications');
            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Error fetching notifications');
        });
    });

    describe('POST /mock', () => {
        it('should call createNotification and return 200', async () => {
            (NotificationService.createNotification as jest.Mock).mockResolvedValue({});
            const response = await request(app).post('/api/user/notifications/mock');
            expect(response.status).toBe(200);
            expect(NotificationService.createNotification).toHaveBeenCalledWith('testUserId123', 'Mock Notification', 'Hello World');
        });
    });

    describe('PATCH /:id/read', () => {
        it('should return 200 and the updated notification on success', async () => {
            const updatedNotification = { _id: 'notif123', read: true };
            (NotificationService.markAsRead as jest.Mock).mockResolvedValue(updatedNotification);

            const response = await request(app).patch('/api/user/notifications/notif123/read');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedNotification);
            expect(NotificationService.markAsRead).toHaveBeenCalledWith('notif123');
        });

        it('should return 404 if the notification is not found', async () => {
            (NotificationService.markAsRead as jest.Mock).mockResolvedValue(null);
            const response = await request(app).patch('/api/user/notifications/notif123/read');
            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /read', () => {
        it('should call deleteAllReadForUser and return 200', async () => {
            (NotificationService.deleteAllReadForUser as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
            const response = await request(app).delete('/api/user/notifications/read');
            expect(response.status).toBe(200);
            expect(NotificationService.deleteAllReadForUser).toHaveBeenCalledWith('testUserId123');
        });
    });

    describe('DELETE /:id', () => {
        it('should return 200 on successful deletion', async () => {
            (NotificationService.deleteNotification as jest.Mock).mockResolvedValue({ _id: 'notif123' });
            const response = await request(app).delete('/api/user/notifications/notif123');
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Notification deleted successfully');
        });

        it('should return 404 if the notification is not found', async () => {
            (NotificationService.deleteNotification as jest.Mock).mockResolvedValue(null);
            const response = await request(app).delete('/api/user/notifications/notif123');
            expect(response.status).toBe(404);
        });
    });

    describe('PATCH /read-all', () => {
        it('should call markAllAsReadForUser and return 200', async () => {
            (NotificationService.markAllAsReadForUser as jest.Mock).mockResolvedValue({ acknowledged: true, modifiedCount: 3 });
            const response = await request(app).patch('/api/user/notifications/read-all');
            expect(response.status).toBe(200);
            expect(NotificationService.markAllAsReadForUser).toHaveBeenCalledWith('testUserId123');
        });
    });

    describe('PATCH /:id/restore', () => {
        it('should return 200 and the restored notification on success', async () => {
            const restoredNotification = { _id: 'notif123', deletedAt: null };
            (NotificationService.restoreNotification as jest.Mock).mockResolvedValue(restoredNotification);
            const response = await request(app).patch('/api/user/notifications/notif123/restore');
            expect(response.status).toBe(200);
            expect(response.body).toEqual(restoredNotification);
            expect(NotificationService.restoreNotification).toHaveBeenCalledWith('notif123');
        });

        it('should return 404 if the notification to restore is not found', async () => {
            (NotificationService.restoreNotification as jest.Mock).mockResolvedValue(null);
            const response = await request(app).patch('/api/user/notifications/notif123/restore');
            expect(response.status).toBe(404);
        });
    });
});
