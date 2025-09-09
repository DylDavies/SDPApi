import { model, Schema } from "mongoose";
import IBadge from "../../models/interfaces/IBadge.interface";

export interface IBadgeDocument extends Document, IBadge{}

const badgeSchema = new Schema<IBadgeDocument>({
    name: { type: String, required: true, unique: true, trim: true},
    image: { type: String, required: true },
    TLA: { type: String, required: true, trim: true },
    summary: { type: String, required: true },
    description: { type: String, required: true },
    permanent: { type: Boolean, required: true, default: false },
    expirationDate: { type: Date, required: false },
    bonus: { type: Number, required: true, default: 0 }
    
}, { timestamps: true })

const MBadge = model<IBadgeDocument>("Badges", badgeSchema); 

export default MBadge;