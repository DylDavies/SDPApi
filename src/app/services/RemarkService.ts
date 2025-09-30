import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";
import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MRemark, { IRemark } from "../db/models/MRemark.model";
import MRemarkTemplate, { IRemarkTemplate, IRemarkField } from "../db/models/MRemarkTemplate.model";
import MEvent from "../db/models/MEvent.model";
import PayslipService from "./PayslipService";
import UserService from "./UserService";
import IBadge from "../models/interfaces/IBadge.interface";

export class RemarkService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

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

    public async createRemark(eventId: string, entries: { field: string, value: any }[]): Promise<IRemark> {
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

        return newRemark;
    }

    public async updateRemark(remarkId: string, entries: { field: string, value: any }[]): Promise<IRemark | null> {
        return MRemark.findByIdAndUpdate(remarkId, { entries }, { new: true }).populate('template');
    }

    public async getRemarkForEvent(eventId: string): Promise<IRemark | null> {
        return MRemark.findOne({ event: eventId }).populate('template');
    }
}

export default Singleton.getInstance(RemarkService);