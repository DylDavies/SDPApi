import { SendMailClient } from 'zeptomail';
import { Singleton } from '../models/classes/Singleton';
import { LoggingService } from './LoggingService';
import { IService } from '../models/interfaces/IService.interface';
import { EServiceLoadPriority } from '../models/enums/EServiceLoadPriority.enum';

export class EmailService implements IService {
    public static loadPriority = EServiceLoadPriority.Low;
    private client: SendMailClient;
    private logger = Singleton.getInstance(LoggingService);

    constructor() {
        const token = process.env.ZEPTOMAIL_TOKEN;
        if (!token) {
            this.logger.warn('ZEPTOMAIL_TOKEN is not set. Email service will not be available.');
        }
        
        // Initialize the ZeptoMail client
        this.client = new SendMailClient({
            url: "api.zeptomail.com/", // Use the correct API URL for your region if different
            token: token!,
        });
    }

    /**
     * Verifies the connection to the ZeptoMail API.
     * Note: ZeptoMail's library doesn't have a built-in 'verify' method,
     * so we will consider it initialized if the token is present.
     * The first actual send will confirm the connection.
     */
    async init(): Promise<void> {
        if (process.env.ZEPTOMAIL_TOKEN) {
            this.logger.info('Zoho ZeptoMail service is configured.');
        } else {
            this.logger.error('Failed to initialize Zoho ZeptoMail service: ZEPTOMAIL_TOKEN is missing.');
        }
        return Promise.resolve();
    }

/**
     * Sends an email using the Zoho ZeptoMail API.
     * @param to Recipient's email address.
     * @param subject The subject of the email.
     * @param html The HTML body of the email.
     */
    async sendEmail(to: string, subject: string, html: string): Promise<void> {
        if (!this.client) {
            this.logger.error('Email client is not initialized. Cannot send email.');
            return;
        }

        try {
            await this.client.sendMail({
                from: {
                    address: process.env.EMAIL_FROM!,
                    name: "TutorCore",
                },
                to: [
                    {
                        email_address: {
                            address: to,
                        },
                    },
                ],
                subject: subject,
                htmlbody: html,
            });
            this.logger.info(`Email sent to ${to} via Zoho ZeptoMail.`);
        } catch (error) {
            this.logger.error('Error sending email via Zoho ZeptoMail:', error);
        }
    }
}

export default Singleton.getInstance(EmailService);
