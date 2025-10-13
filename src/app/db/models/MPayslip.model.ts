import { Schema, model, Document } from 'mongoose';
import { IPayslip } from '../../models/interfaces/IPayslip.interface';
import { EPayslipStatus } from '../../models/enums/EPayslipStatus.enum';

const PayslipSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    payPeriod: { type: String, required: true },
    status: { type: String, enum: Object.values(EPayslipStatus), default: EPayslipStatus.DRAFT },
    earnings: [{
        description: String,
        baseRate: Number,
        hours: Number,
        rate: Number,
        total: Number,
        date: String,
    }],
    miscEarnings: [{
        description: String,
        amount: Number,
    }],
    bonuses: [{
        description: String,
        amount: Number,
    }],
    deductions: [{
        description: String,
        amount: Number,
    }],
    grossEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    uif: { type: Number, default: 0 },
    paye: { type: Number, default: 0 },
    notes: [{
        itemId: String,
        note: String,
        resolved: Boolean,
        resolutionNote: String,
    }],
    history: [{
        status: String,
        timestamp: Date,
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    }],
});

export const MPayslip = model<IPayslip & Document>('payslip', PayslipSchema);