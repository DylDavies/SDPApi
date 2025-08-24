import { Schema, model, Document } from "mongoose";
import ISubject from "../../models/interfaces/ISubject.interface";

export interface IProficiency extends Document{
    name: string;
    subjects: ISubject;
}

const ProficiencySchema = new Schema<IProficiency>({
    name: { type: String, required: true, unique: true },
    subjects: { type: Object, required: true }
});

const MProficiencies = model<IProficiency>("Proficiencies", ProficiencySchema);

export default MProficiencies;
