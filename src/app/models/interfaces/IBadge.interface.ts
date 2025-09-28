import { Types } from "mongoose";

export default interface IBadge{
    _id: Types.ObjectId;
    name: string;
    image: string;
    TLA: string;
    summary: string;
    description: string;
    permanent: boolean;
    duration?: number;
    bonus: number;
}