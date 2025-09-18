import { Singleton } from '../models/classes/Singleton';
import { LoggingService } from './LoggingService';
import MNotification, { INotification } from '../db/models/MNotification.model';
import { SocketService } from './SocketService';
import { EmailService } from './EmailService';
import MUser from '../db/models/MUser.model';
import { ESocketMessage } from '../models/enums/ESocketMessage.enum';
import { IService } from '../models/interfaces/IService.interface';
import { EServiceLoadPriority } from '../models/enums/EServiceLoadPriority.enum';

export class NotificationService implements IService {
    public static loadPriority = EServiceLoadPriority.Medium;
    
    private _logger: LoggingService | null = null;
    private get logger(): LoggingService {
        if (!this._logger) this._logger = Singleton.getInstance(LoggingService);
        return this._logger;
    }

    private _socketService: SocketService | null = null;
    private get socketService(): SocketService {
        if (!this._socketService) this._socketService = Singleton.getInstance(SocketService);
        return this._socketService;
    }

    private _emailService: EmailService | null = null;
    private get emailService(): EmailService {
        if (!this._emailService) this._emailService = Singleton.getInstance(EmailService);
        return this._emailService;
    }

    async init(): Promise<void> {
        this.logger.info("Notification service initialized");
    }

    /**
     * Creates a new notification and optionally sends an email.
     * @param recipientId The ID of the user who should receive the notification.
     * @param title The title of the notification.
     * @param message The main content of the notification.
     * @param sendEmail If true, an email will also be sent.
     * @param emailHtml Optional custom HTML for the email.
     */
    async createNotification(
        recipientId: string,
        title: string,
        message: string,
        sendEmail: boolean = false,
        emailHtml?: string
    ): Promise<INotification> {
        const notification = await MNotification.create({
            recipientId,
            title,
            message,
        });

        // Emit a real-time event to the user
        this.socketService.emitToUser(recipientId, ESocketMessage.NotificationsUpdated, notification);

        if (sendEmail) {
            const user = await MUser.findById(recipientId);
            if (user) {
                const html = emailHtml || `<p>${message}</p>`;
                await this.emailService.sendEmail(user.email, title, html);
            }
        }

        return notification;
    }
    
    /**
     * Finds all notifications for a specific user.
     * @param userId The ID of the user.
     * @returns A promise that resolves to an array of notifications.
     */
    async getNotificationsForUser(userId: string): Promise<INotification[]> {
        return MNotification.find({ recipientId: userId, deletedAt: null }).sort({ createdAt: -1 });
    }

    /**
     * Marks a notification as read.
     * @param notificationId The ID of the notification.
     * @returns The updated notification document or null if not found.
     */
    async markAsRead(notificationId: string): Promise<INotification | null> {
        const notification = await MNotification.findByIdAndUpdate(
            notificationId,
            { read: true },
            { new: true }
        );

        if (notification) {
            this.socketService.emitToUser(notification.recipientId.toString(), ESocketMessage.NotificationsUpdated, notification);
        }

        return notification;
    }

    /**
     * Marks a notification as deleted.
     * @param notificationId The ID of the notification to delete.
     * @returns The updated notification document or null if not found.
     */
    async deleteNotification(notificationId: string): Promise<INotification | null> {
        const notification = await MNotification.findByIdAndUpdate(
            notificationId,
            { deletedAt: new Date() },
            { new: true }
        );

        if (notification) {
            // Also emit an update to the user
            this.socketService.emitToUser(notification.recipientId.toString(), ESocketMessage.NotificationsUpdated, notification);
        }

        return notification;
    }

    /**
     * Marks all unread notifications as read for a specific user.
     * @param userId The ID of the user.
     */
    async markAllAsReadForUser(userId: string): Promise<{ acknowledged: boolean, modifiedCount: number }> {
        const result = await MNotification.updateMany(
            { recipientId: userId, read: false },
            { $set: { read: true } }
        );
        this.socketService.emitToUser(userId, ESocketMessage.NotificationsUpdated, {});
        return { acknowledged: result.acknowledged, modifiedCount: result.modifiedCount };
    }

    /**
     * Deletes all read notifications for a specific user (soft delete).
     * @param userId The ID of the user.
     */
    async deleteAllReadForUser(userId: string): Promise<{ acknowledged: boolean, modifiedCount: number }> {
        const result = await MNotification.updateMany(
            { recipientId: userId, read: true, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        );
        this.socketService.emitToUser(userId, ESocketMessage.NotificationsUpdated, {});
        return { acknowledged: result.acknowledged, modifiedCount: result.modifiedCount };
    }

    /**
     * Restores a soft-deleted notification.
     * @param notificationId The ID of the notification to restore.
     * @returns The restored notification document or null if not found.
     */
    async restoreNotification(notificationId: string): Promise<INotification | null> {
        const notification = await MNotification.findByIdAndUpdate(
            notificationId,
            { $set: { deletedAt: null } },
            { new: true }
        );

        if (notification) {
            this.socketService.emitToUser(notification.recipientId.toString(), ESocketMessage.NotificationsUpdated, notification);
        }

        return notification;
    }
}

export default Singleton.getInstance(NotificationService);
