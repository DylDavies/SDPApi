import { Types } from 'mongoose'; // Changed from 'Schema' to 'Types'
import { EPayslipStatus } from '../enums/EPayslipStatus.enum';

export interface IPayslip {
    userId: Types.ObjectId; // Changed from Schema.Types.ObjectId
    payPeriod: string; // e.g., "2025-09"
    status: EPayslipStatus;
    earnings: {
        description: string;
        baseRate: number;
        hours: number;
        rate: number;
        total: number;
        date: string;
    }[];
    miscEarnings: {
        description: string;
        amount: number;
    }[];
    bonuses: {
        description: string;
        amount: number;
    }[];
    deductions: {
        description: string;
        amount: number;
    }[];
    grossEarnings: number;
    totalDeductions: number;
    netPay: number;
    uif: number;
    paye: number;
    notes: {
        _id?: Types.ObjectId;
        itemId: string;
        note: string;
        resolved: boolean;
        resolutionNote?: string;
    }[];
    history: {
        status: EPayslipStatus;
        timestamp: Date;
        updatedBy: Types.ObjectId; // Changed from Schema.Types.ObjectId
    }[];
}
