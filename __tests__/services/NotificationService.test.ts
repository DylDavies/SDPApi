import { Singleton } from '../../src/app/models/classes/Singleton';
import { NotificationService } from '../../src/app/services/NotificationService';
import { SocketService } from '../../src/app/services/SocketService';
import { EmailService } from '../../src/app/services/EmailService';
import { LoggingService } from '../../src/app/services/LoggingService';
import MNotification from '../../src/app/db/models/MNotification.model';
import MUser from '../../src/app/db/models/MUser.model';
import { ESocketMessage } from '../../src/app/models/enums/ESocketMessage.enum';

// Mock all dependencies at the module level
jest.mock('../../src/app/db/models/MNotification.model');
jest.mock('../../src/app/db/models/MUser.model');
jest.mock('../../src/app/services/SocketService');
jest.mock('../../src/app/services/EmailService');
jest.mock('../../src/app/services/LoggingService');

// Use a fixed date for predictable soft-delete timestamps
const MOCK_DATE = new Date('2025-01-01T12:00:00.000Z');
jest.useFakeTimers().setSystemTime(MOCK_DATE);

describe('NotificationService', () => {
    let notificationService: NotificationService;
    let mockSocketService: jest.Mocked<SocketService>;
    let mockEmailService: jest.Mocked<EmailService>;
    let mockLogger: jest.Mocked<LoggingService>;

    beforeEach(() => {
        // Clear mocks before each test to ensure isolation
        jest.clearAllMocks();

        // Since we are testing the NotificationService class, we get a fresh instance for it.
        // For its dependencies, we get the mocked instances from the Singleton.
        notificationService = new NotificationService();
        mockSocketService = Singleton.getInstance(SocketService) as jest.Mocked<SocketService>;
        mockEmailService = Singleton.getInstance(EmailService) as jest.Mocked<EmailService>;
        mockLogger = Singleton.getInstance(LoggingService) as jest.Mocked<LoggingService>;
    });

    describe('init', () => {
        it('should log that the service has been initialized', async () => {
            await notificationService.init();
            expect(mockLogger.info).toHaveBeenCalledWith('Notification service initialized');
        });
    });

    describe('createNotification', () => {
        it('should create a notification and emit a socket event', async () => {
            const mockNotification = { _id: 'notif123', recipientId: 'user123' };
            (MNotification.create as jest.Mock).mockResolvedValue(mockNotification);

            const result = await notificationService.createNotification('user123', 'Test Title', 'Test Message');

            expect(MNotification.create).toHaveBeenCalledWith({
                recipientId: 'user123',
                title: 'Test Title',
                message: 'Test Message',
            });
            expect(mockSocketService.emitToUser).toHaveBeenCalledWith('user123', ESocketMessage.NotificationsUpdated, mockNotification);
            expect(result).toEqual(mockNotification);
        });

        it('should send an email with default HTML when sendEmail is true', async () => {
            const mockUser = { email: 'test@example.com' };
            (MNotification.create as jest.Mock).mockResolvedValue({});
            (MUser.findById as jest.Mock).mockResolvedValue(mockUser);

            await notificationService.createNotification('user123', 'Email Title', 'Email Message', true);

            expect(MUser.findById).toHaveBeenCalledWith('user123');
            expect(mockEmailService.sendEmail).toHaveBeenCalledWith(mockUser.email, 'Email Title', '<p>Email Message</p>');
        });
        
        it('should send an email with custom HTML when provided', async () => {
            const mockUser = { email: 'test@example.com' };
            (MNotification.create as jest.Mock).mockResolvedValue({});
            (MUser.findById as jest.Mock).mockResolvedValue(mockUser);
            const customHtml = '<h1>Custom!</h1>';

            await notificationService.createNotification('user123', 'Email Title', 'Email Message', true, customHtml);

            expect(mockEmailService.sendEmail).toHaveBeenCalledWith(mockUser.email, 'Email Title', customHtml);
        });

        it('should not attempt to send an email if the user is not found', async () => {
            (MNotification.create as jest.Mock).mockResolvedValue({});
            (MUser.findById as jest.Mock).mockResolvedValue(null);

            await notificationService.createNotification('user123', 'Test', 'Test', true);

            expect(MUser.findById).toHaveBeenCalledWith('user123');
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        });
    });

    describe('getNotificationsForUser', () => {
        it('should find notifications for a user and sort them by creation date', async () => {
            const findMock = {
                sort: jest.fn().mockResolvedValue([{ title: 'notif1' }]),
            };
            (MNotification.find as jest.Mock).mockReturnValue(findMock);

            const notifications = await notificationService.getNotificationsForUser('user123');

            expect(MNotification.find).toHaveBeenCalledWith({ recipientId: 'user123', deletedAt: null });
            expect(findMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(notifications).toEqual([{ title: 'notif1' }]);
        });
    });

    describe('markAsRead', () => {
        it('should find and update a notification and emit a socket event on success', async () => {
            const mockNotification = { _id: 'notif123', recipientId: { toString: () => 'user123' } };
            (MNotification.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockNotification);

            const result = await notificationService.markAsRead('notif123');

            expect(MNotification.findByIdAndUpdate).toHaveBeenCalledWith('notif123', { read: true }, { new: true });
            expect(mockSocketService.emitToUser).toHaveBeenCalledWith('user123', ESocketMessage.NotificationsUpdated, mockNotification);
            expect(result).toEqual(mockNotification);
        });

        it('should return null and not emit an event if notification is not found', async () => {
            (MNotification.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

            const result = await notificationService.markAsRead('notif123');

            expect(mockSocketService.emitToUser).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });

    describe('deleteNotification', () => {
        it('should soft delete a notification and emit a socket event on success', async () => {
            const mockNotification = { _id: 'notif123', recipientId: { toString: () => 'user123' } };
            (MNotification.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockNotification);
            
            const result = await notificationService.deleteNotification('notif123');
            
            expect(MNotification.findByIdAndUpdate).toHaveBeenCalledWith('notif123', { deletedAt: MOCK_DATE }, { new: true });
            expect(mockSocketService.emitToUser).toHaveBeenCalledWith('user123', ESocketMessage.NotificationsUpdated, mockNotification);
            expect(result).toEqual(mockNotification);
        });

        it('should return null and not emit an event if notification is not found', async () => {
            (MNotification.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

            const result = await notificationService.deleteNotification('notif123');

            expect(mockSocketService.emitToUser).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });

    describe('markAllAsReadForUser', () => {
        it('should update many notifications and emit one socket event', async () => {
            const mockResult = { acknowledged: true, modifiedCount: 3 };
            (MNotification.updateMany as jest.Mock).mockResolvedValue(mockResult);

            const result = await notificationService.markAllAsReadForUser('user123');

            expect(MNotification.updateMany).toHaveBeenCalledWith({ recipientId: 'user123', read: false }, { $set: { read: true } });
            expect(mockSocketService.emitToUser).toHaveBeenCalledWith('user123', ESocketMessage.NotificationsUpdated, {});
            expect(result).toEqual(mockResult);
        });
    });

    describe('deleteAllReadForUser', () => {
        it('should soft delete all read notifications and emit one socket event', async () => {
            const mockResult = { acknowledged: true, modifiedCount: 5 };
            (MNotification.updateMany as jest.Mock).mockResolvedValue(mockResult);

            const result = await notificationService.deleteAllReadForUser('user123');

            expect(MNotification.updateMany).toHaveBeenCalledWith(
                { recipientId: 'user123', read: true, deletedAt: null },
                { $set: { deletedAt: MOCK_DATE } }
            );
            expect(mockSocketService.emitToUser).toHaveBeenCalledWith('user123', ESocketMessage.NotificationsUpdated, {});
            expect(result).toEqual(mockResult);
        });
    });
    
    describe('restoreNotification', () => {
        it('should restore a soft-deleted notification and emit a socket event on success', async () => {
            const mockNotification = { _id: 'notif123', recipientId: { toString: () => 'user123' } };
            (MNotification.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockNotification);

            const result = await notificationService.restoreNotification('notif123');

            expect(MNotification.findByIdAndUpdate).toHaveBeenCalledWith('notif123', { $set: { deletedAt: null } }, { new: true });
            expect(mockSocketService.emitToUser).toHaveBeenCalledWith('user123', ESocketMessage.NotificationsUpdated, mockNotification);
            expect(result).toEqual(mockNotification);
        });

        it('should return null and not emit an event if notification is not found', async () => {
            (MNotification.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
            
            const result = await notificationService.restoreNotification('notif123');

            expect(mockSocketService.emitToUser).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });
});
