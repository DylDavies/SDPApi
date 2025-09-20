import IBadge from "./IBadge.interface";

export interface IBadgeWithRequirements extends IBadge{
    requirements?: string;
}