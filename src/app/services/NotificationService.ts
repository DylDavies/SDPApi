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
    private logger = Singleton.getInstance(LoggingService);
    private socketService = Singleton.getInstance(SocketService);
    private emailService = Singleton.getInstance(EmailService);

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
        return MNotification.find({ recipientId: userId }).sort({ createdAt: -1 });
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
}

export default Singleton.getInstance(NotificationService);
