import { model, Schema, Types, Document } from "mongoose";

export interface IBadgeRequirement extends Document {
    badgeId: Types.ObjectId;
    requirements: string;
}

const BadgeRequirementSchema = new Schema<IBadgeRequirement>({
    badgeId: {
        type: Schema.Types.ObjectId,
        ref: 'Badges',
        required: true,
        unique: true,
        index: true
    },
    requirements: {
        type: String,
        required: true,
        default: 'No requirements specified for this badge yet.'
    }
}, { timestamps: true });

const MBadgeRequirement = model<IBadgeRequirement>("BadgeRequirement", BadgeRequirementSchema);

export default MBadgeRequirement;