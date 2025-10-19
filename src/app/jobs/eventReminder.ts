import * as cron from 'node-cron';
import MEvent from '../db/models/MEvent.model';
import notificationService from '../services/NotificationService';
import { generateEmailTemplate, formatDateTime } from '../utils/emailTemplates';
import { Singleton } from '../models/classes/Singleton';
import { LoggingService } from '../services/LoggingService';

const logger = Singleton.getInstance(LoggingService);

/**
 * Sends reminders for upcoming events (lessons) that are scheduled within the next 24 hours
 * Runs every day at 9:00 AM
 */
export function startEventReminderJob() {
    // Run daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        try {
            logger.info('Running event reminder job...');

            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Find all events scheduled in the next 24 hours that haven't been remarked yet
            const upcomingEvents = await MEvent.find({
                startTime: {
                    $gte: now,
                    $lte: tomorrow
                },
                remarked: false
            }).populate('tutor', 'displayName email')
              .populate('student', 'displayName')
              .exec();

            logger.info(`Found ${upcomingEvents.length} upcoming events to send reminders for`);

            // Send reminders to tutors
            for (const event of upcomingEvents) {
                const tutor = event.tutor as any;
                if (tutor) {
                    const student = event.student as any;
                    const content = `
                        <p>Hi ${tutor.displayName},</p>
                        <p>This is a reminder about your upcoming lesson:</p>
                        <div class="highlight">
                            <p><strong>Subject:</strong> ${event.subject}</p>
                            <p><strong>Student:</strong> ${student?.displayName || 'Unknown'}</p>
                            <p><strong>Time:</strong> ${formatDateTime(event.startTime)}</p>
                            <p><strong>Duration:</strong> ${event.duration} minutes</p>
                        </div>
                        <p>Please make sure you're prepared for this lesson.</p>
                    `;

                    const html = generateEmailTemplate(
                        'Upcoming Lesson Reminder',
                        content,
                        { text: 'View Schedule', url: `${process.env.FRONTEND_URL}/dashboard` }
                    );

                    await notificationService.createNotification(
                        event.tutor.toString(),
                        "Lesson Reminder",
                        `Reminder: ${event.subject} lesson with ${student?.displayName || 'student'} at ${formatDateTime(event.startTime)}`,
                        true,
                        html
                    );
                }
            }

            logger.info('Event reminder job completed successfully');
        } catch (error) {
            logger.error('Error in event reminder job:', error);
        }
    });

    logger.info('Event reminder job scheduled (runs daily at 9:00 AM)');
}
