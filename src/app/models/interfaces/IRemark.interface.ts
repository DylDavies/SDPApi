export type RemarkFieldType = 'string' | 'boolean' | 'number' | 'time';

export interface IRemarkField {
    name: string;
    type: RemarkFieldType;
}

export interface IRemark {
    _id: string;
    event: string;
    template: IRemarkTemplate;
    remarkedAt: Date;
    entries: {
        field: string;
        value: any;
    }[];
}

export interface IRemarkTemplate {
    _id: string;
    name: string;
    fields: IRemarkField[];
    isActive: boolean;
}

