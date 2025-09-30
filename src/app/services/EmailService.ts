//import nodemailer from 'nodemailer';
import { Singleton } from '../models/classes/Singleton';
//import { LoggingService } from './LoggingService';
import { IService } from '../models/interfaces/IService.interface';
import { EServiceLoadPriority } from '../models/enums/EServiceLoadPriority.enum';

export class EmailService implements IService {
    public static loadPriority = EServiceLoadPriority.Low;
    //private transporter: nodemailer.Transporter;
    //private logger = Singleton.getInstance(LoggingService);

    constructor() {
        // We will use environment variables for the email configuration
        // this.transporter = nodemailer.createTransport({
        //     host: process.env.EMAIL_HOST,
        //     port: Number(process.env.EMAIL_PORT),
        //     secure: process.env.EMAIL_SECURE === 'true',
        //     auth: {
        //         user: process.env.EMAIL_USER,
        //         pass: process.env.EMAIL_PASS,
        //     },
        // });
    }

    async init(): Promise<void> {
        // try {
        //     await this.transporter.verify();
        //     this.logger.info('Email service is ready to send messages');
        // } catch (error) {
        //     this.logger.error('Failed to initialize email service:', error);
        // }
    }

    /**
     * Sends an email.
     * @param to Recipient's email address.
     * @param subject The subject of the email.
     * @param html The HTML body of the email.
     */
    async sendEmail(_to: string, _subject: string, _html: string): Promise<void> {
        // const mailOptions = {
        //     from: `"TutorCore" <${process.env.EMAIL_FROM}>`,
        //     to,
        //     subject,
        //     html,
        // };

        // try {
        //     const info = await this.transporter.sendMail(mailOptions);
        //     this.logger.info(`Email sent: ${info.messageId}`);
        // } catch (error) {
        //     this.logger.error('Error sending email:', error);
        // }
    }
}

export default Singleton.getInstance(EmailService);
