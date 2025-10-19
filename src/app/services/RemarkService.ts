import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MRemark, { IRemark } from "../db/models/MRemark.model";
import MRemarkTemplate, { IRemarkTemplate, IRemarkField } from "../db/models/MRemarkTemplate.model";
import MEvent from "../db/models/MEvent.model";
import MDocument from "../db/models/MDocument.model";
import PayslipService from "./PayslipService";
import UserService from "./UserService";
import IBadge from "../models/interfaces/IBadge.interface";
import { Types } from "mongoose";
import notificationService from "./NotificationService";
import MBundle from "../db/models/MBundle.model";
import { generateEmailTemplate, formatDateTime, createDetailsTable } from "../utils/emailTemplates";

export class RemarkService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    private async populateDocumentsInEntries(remark: any): Promise<IRemark> {
        if (!remark || !remark.entries) return remark;

        // Convert to plain object if it's a Mongoose document
        const remarkObj = typeof remark.toObject === 'function' ? remark.toObject() : remark;

        const template = await MRemarkTemplate.findById(remarkObj.template);
        if (!template) return remarkObj;

        for (let i = 0; i < remarkObj.entries.length; i++) {
            const entry = remarkObj.entries[i];
            const fieldDef = template.fields.find(f => f.name === entry.field);

            if (fieldDef && ['pdf', 'image', 'audio'].includes(fieldDef.type)) {
                // Handle both string and ObjectId formats
                const documentId = entry.value;
                if (documentId && Types.ObjectId.isValid(documentId)) {
                    try {
                        const document = await MDocument.findById(documentId);
                        if (document) {
                            remarkObj.entries[i].value = document.toObject();
                        }
                    } catch {
                        // Document not found or error loading - silently skip
                    }
                }
            }
        }

        return remarkObj;
    }

    public async init(): Promise<void> {
        const count = await MRemarkTemplate.countDocuments();
        if (count === 0) {
            const defaultTemplate = new MRemarkTemplate({
                name: "Default Template",
                fields: [
                    { name: "Attitude", type: "string" },
                    { name: "Homework Complete", type: "boolean" },
                    { name: "What was covered in the lesson", type: "string" },
                    { name: "What homework was given", type: "string" },
                    { name: "What is planned for the next lesson", type: "string" },
                    { name: "Lesson Duration", type: "time" }
                ],
                isActive: true
            });
            await defaultTemplate.save();
        }
    }

    public async getActiveTemplate(): Promise<IRemarkTemplate | null> {
        return MRemarkTemplate.findOne({ isActive: true });
    }

    public async updateTemplate(fields: IRemarkField[]): Promise<IRemarkTemplate> {
        if (!fields) {
            throw new Error("Fields are required to update a template.");
        }
        await MRemarkTemplate.updateMany({ isActive: true }, { $set: { isActive: false } });
        const templateCount = await MRemarkTemplate.countDocuments();
        const newTemplate = await MRemarkTemplate.create({
            name: `v_${templateCount}`,
            fields,
            isActive: true
        });
        //await newTemplate.save();
        return newTemplate;
    }

    public async createRemark(eventId: string, entries: { field: string; value: any }[]): Promise<IRemark> {
        const activeTemplate = await this.getActiveTemplate();
        if (!activeTemplate) {
            throw new Error("No active remark template found.");
        }

        const existingEvent = await MEvent.findById(eventId).populate('student', 'displayName');
        if (existingEvent && existingEvent.remarked) {
            throw new Error("This event has already been remarked.");
        }

        const newRemark = await MRemark.create({
            event: eventId,
            entries,
            template: activeTemplate._id
        });

        await MEvent.findByIdAndUpdate(eventId, { remarked: true, remark: newRemark._id });

        const user = await UserService.getUser(existingEvent!.tutor.toHexString());

        // Payment
        let rate = user?.rateAdjustments
            .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0]?.newRate;

        if (rate) {
            // Add badge rates
            const badges = user!.badges;

            if (badges) rate += badges.map(b => (b.badge as unknown as IBadge).bonus).reduce((prev, curr) => prev + curr);

            await PayslipService.addCompletedEvent({
                baseRate: 50,
                quantity: existingEvent!.duration / 60,
                eventDate: existingEvent!.startTime,
                rate,
                userId: existingEvent!.tutor,
                description: `${existingEvent!.subject} lesson for ${(existingEvent!.student as unknown as {displayName: string}).displayName}`
            });
        }

        // Notify stakeholders about completed event with remark
        const bundle = await MBundle.findById(existingEvent!.bundle);
        if (bundle && bundle.stakeholders && bundle.stakeholders.length > 0) {
            // Format remark entries for email
            const remarkDetails = entries.map(entry => `<strong>${entry.field}:</strong> ${entry.value}`).join('<br>');

            const content = `
                <p>An event has been completed and remarked.</p>
                ${createDetailsTable({
                    'Subject': existingEvent!.subject,
                    'Student': (existingEvent!.student as unknown as {displayName: string}).displayName,
                    'Date': formatDateTime(existingEvent!.startTime),
                    'Duration': `${existingEvent!.duration} minutes`
                })}
                <div class="highlight">
                    <p><strong>Remark Details:</strong></p>
                    <p>${remarkDetails}</p>
                </div>
            `;

            const html = generateEmailTemplate(
                'Event Completed',
                content,
                { text: 'View Events', url: `${process.env.FRONTEND_URL}/dashboard` }
            );

            // Notify all stakeholders
            for (const stakeholderId of bundle.stakeholders) {
                await notificationService.createNotification(
                    stakeholderId.toString(),
                    "Event Completed",
                    `A ${existingEvent!.subject} lesson for ${(existingEvent!.student as unknown as {displayName: string}).displayName} has been completed and remarked.`,
                    true,
                    html
                );
            }
        }

        return newRemark;
    }

    public async updateRemark(remarkId: string, entries: { field: string; value: any }[]): Promise<IRemark | null> {
        const remark = await MRemark.findByIdAndUpdate(remarkId, { entries }, { new: true })
            .populate('template');

        if (!remark) return null;

        return this.populateDocumentsInEntries(remark);
    }

    public async getRemarkForEvent(eventId: string): Promise<IRemark | null> {
        const remark = await MRemark.findOne({ event: eventId })
            .populate('template');

        if (!remark) return null;

        return this.populateDocumentsInEntries(remark);
    }

    /**
     * Gets all remarks for a specific student across all their events.
     * @param {string} studentId - The ID of the student.
     * @returns {Promise<IRemark[]>} An array of remarks with populated event details.
     */
    public async getRemarksForStudent(studentId: string): Promise<IRemark[]> {
        const events = await MEvent.find({ student: studentId }).select('_id');
        const eventIds = events.map(e => e._id);

        const remarks = await MRemark.find({ event: { $in: eventIds } })
            .populate('template')
            .populate({
                path: 'event',
                populate: [
                    { path: 'tutor', select: 'displayName' },
                    { path: 'student', select: 'displayName' }
                ]
            })
            .sort({ remarkedAt: -1 })
            .exec();

        // Populate documents in entries for each remark
        const populatedRemarks = await Promise.all(
            remarks.map(remark => this.populateDocumentsInEntries(remark))
        );

        return populatedRemarks;
    }
}

export default Singleton.getInstance(RemarkService);