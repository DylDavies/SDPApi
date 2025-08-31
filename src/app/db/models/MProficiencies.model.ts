import { Schema, model, Document } from "mongoose";
import ISubject from "../../models/interfaces/ISubject.interface";
import { IProficiency } from "../../models/interfaces/IProficiency.interface";

const SubjectSchema = new Schema<ISubject>({
    name: { type: String, required: true },
    grades: {type: [String], required: true, default: [] },
}, {_id: true});

export interface IProficiencyDocument extends Document {
    name: string;
    subjects: Map<string, ISubject>;
}

const ProficiencySchema = new Schema<IProficiencyDocument>({
    name: { type: String, required: true },
    subjects: {
        type: Map,
        of: SubjectSchema,
        required: true
    }
});

const MProficiencies = model<IProficiencyDocument>("Proficiencies", ProficiencySchema);

export default MProficiencies;
