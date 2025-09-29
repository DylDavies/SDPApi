import { IService } from '../models/interfaces/IService.interface';
import { Singleton } from '../models/classes/Singleton';
import { EServiceLoadPriority } from '../models/enums/EServiceLoadPriority.enum';
import { MPayslip } from '../db/models/MPayslip.model';
import { Types } from 'mongoose';
import { EPayslipStatus } from '../models/enums/EPayslipStatus.enum';
import { IEventPayload } from '../models/interfaces/IEventPayload.interface';
import ConfigService from './ConfigService';
import { IPayslip } from '../models/interfaces/IPayslip.interface';
import { MPreapprovedItems } from '../db/models/MPreapprovedItems.model';
import { IPreapprovedItem } from '../models/interfaces/IPreapprovedItem.interface';

// Helper interface for the tax calculation result
interface ITaxCalculation {
    paye: number;
    uif: number;
}

export class PayslipService implements IService {
    public loadPriority: EServiceLoadPriority = EServiceLoadPriority.Medium;
    public serviceName: string = 'PayslipService';

    // --- Tax Constants (move to a config file later) ---
    private readonly UIF_CONTRIBUTION_RATE = ConfigService.tax.uifRate;
    private readonly UIF_EARNINGS_CEILING = ConfigService.tax.uifCeiling;
    private readonly TAX_BRACKETS = ConfigService.tax.taxBrackets;
    private readonly PRIMARY_REBATE = ConfigService.tax.primaryRebate;

    public async init(): Promise<void> { }
    public async initialize(): Promise<void> { }

    /**
     * Adds a completed event from an external system to the correct draft payslip.
     * @param payload The event data.
     */
    public async addCompletedEvent(payload: IEventPayload) {
        const { userId, eventDate, description, quantity: hours, rate, baseRate } = payload;
        
        const year = eventDate.getFullYear();
        const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
        const payPeriod = `${year}-${month}`;

        const payslip = await this.getOrCreateDraftPayslip(userId, payPeriod);

        const eventIdentifier = `${description} on ${eventDate.toISOString().split('T')[0]}`;
        const eventExists = payslip.earnings.some(e => e.description === eventIdentifier);

        if (!eventExists) {
            payslip.earnings.push({
                description: eventIdentifier,
                baseRate,
                hours: hours,
                rate: rate,
                total: hours * rate + baseRate,
                date: eventDate.toISOString().split('T')[0], // Use event date in YYYY-MM-DD format
            });
            await payslip.save();
        }

        return this.recalculatePayslip(payslip._id as unknown as Types.ObjectId);
    }

    /**
     * Finds the current month's draft payslip for a user, or creates one if it doesn't exist.
     * @param userId The ID of the user.
     * @param payPeriod The pay period string, e.g., "2025-09".
     */
    public async getOrCreateDraftPayslip(userId: Types.ObjectId, payPeriod: string) {
        const existingPayslip = await MPayslip.findOne({ userId, payPeriod, status: EPayslipStatus.DRAFT });

        if (existingPayslip) {
            return existingPayslip;
        }

        const newPayslip = new MPayslip({
            userId,
            payPeriod,
            status: EPayslipStatus.DRAFT,
            history: [{
                status: EPayslipStatus.DRAFT,
                timestamp: new Date(),
                updatedBy: userId,
            }],
        });
        await newPayslip.save();
        return newPayslip;
    }

    public async getPayslipById(payslipId: string) {
        return await MPayslip.findOne({_id: new Types.ObjectId(payslipId)}) as IPayslip | null;
    }

    /**
     * Finds the current month's draft payslip for a user without creating it.
     * @param userId The ID of the user.
     * @param payPeriod The pay period string, e.g., "2025-09".
     */
    public async getDraftPayslip(userId: Types.ObjectId, payPeriod: string) {
        return await MPayslip.findOne({ userId, payPeriod, status: EPayslipStatus.DRAFT });
    }

    /**
     * Updates the status of a payslip and logs the change.
     * @param payslipId The ID of the payslip.
     * @param newStatus The new status to set.
     * @param updatedById The ID of the user making the change.
     */
    public async updatePayslipStatus(payslipId: Types.ObjectId, newStatus: EPayslipStatus, updatedById: Types.ObjectId) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        payslip.status = newStatus;
        payslip.history.push({
            status: newStatus,
            timestamp: new Date(),
            updatedBy: updatedById,
        });

        await payslip.save();
        
        return payslip;
    }

    /**
     * Recalculates all financial figures for a payslip.
     * @param payslipId The ID of the payslip.
     */
    public async recalculatePayslip(payslipId: Types.ObjectId) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) throw new Error("Payslip not found");

        payslip.grossEarnings = payslip.earnings.reduce((acc, item) => acc + item.total, 0);
        const totalBonuses = payslip.bonuses ? payslip.bonuses.reduce((acc, item) => acc + item.amount, 0) : 0;
        const totalMiscEarnings = payslip.miscEarnings ? payslip.miscEarnings.reduce((acc, item) => acc + item.amount, 0) : 0;
        payslip.totalDeductions = payslip.deductions.reduce((acc, item) => acc + item.amount, 0);

        const taxes = await this._calculateCumulativeTaxes(payslip.userId as unknown as Types.ObjectId, payslip.payPeriod, payslip.grossEarnings + totalBonuses + totalMiscEarnings);
        payslip.paye = parseFloat(taxes.paye.toFixed(2));
        payslip.uif = parseFloat(taxes.uif.toFixed(2));

        const net = payslip.grossEarnings + totalBonuses + totalMiscEarnings - payslip.totalDeductions - payslip.paye - payslip.uif;
        payslip.netPay = parseFloat(net.toFixed(2));

        await payslip.save();
        return payslip;
    }
    
    // --- PRIVATE HELPER METHODS FOR TAX CALCULATION ---

    private async _calculateCumulativeTaxes(userId: Types.ObjectId, payPeriod: string, currentGross: number): Promise<ITaxCalculation> {
        const uifableEarnings = Math.min(currentGross, this.UIF_EARNINGS_CEILING);
        const uif = uifableEarnings * this.UIF_CONTRIBUTION_RATE;

        const taxYear = this._getTaxYearForPayPeriod(payPeriod);
        const [periodYear, periodMonth] = payPeriod.split('-').map(Number);
        
        const previousPayslips = await MPayslip.find({
            userId,
            payPeriod: { $gte: `${taxYear}-03`, $lt: payPeriod },
            status: { $in: [EPayslipStatus.LOCKED, EPayslipStatus.PAID] }
        });
        
        const previousEarnings = previousPayslips.reduce((acc, slip) => {
            const bonuses = slip.bonuses ? slip.bonuses.reduce((bonusAcc, bonus) => bonusAcc + bonus.amount, 0) : 0;
            const miscEarnings = slip.miscEarnings ? slip.miscEarnings.reduce((miscAcc, misc) => miscAcc + misc.amount, 0) : 0;
            return acc + slip.grossEarnings + bonuses + miscEarnings;
        }, 0);
        const previousTaxPaid = previousPayslips.reduce((acc, slip) => acc + slip.paye, 0);
        
        const yearToDateEarnings = previousEarnings + currentGross;
        
        const monthsSoFar = (periodYear - taxYear) * 12 + (periodMonth - 2);
        const estimatedAnnualIncome = (monthsSoFar > 0) ? (yearToDateEarnings / monthsSoFar) * 12 : yearToDateEarnings * 12;

        const annualTax = this._calculateAnnualPAYE(estimatedAnnualIncome);
        const yearToDateTaxDue = (annualTax / 12) * monthsSoFar;
        
        let currentMonthPaye = yearToDateTaxDue - previousTaxPaid;
        currentMonthPaye = Math.max(0, currentMonthPaye);

        return { paye: currentMonthPaye, uif };
    }
    
    private _calculateAnnualPAYE(annualIncome: number): number {
        if (annualIncome < 95750) return 0;
    
        let tax = 0;
        let previousLimit = 0;
    
        for (const bracket of this.TAX_BRACKETS) {
            if (annualIncome > previousLimit) {
                const taxableAtBracket = Math.min(annualIncome - previousLimit, bracket.upTo - previousLimit);
                tax += taxableAtBracket * bracket.rate;
            }
            if (annualIncome <= bracket.upTo) {
                break;
            }
            previousLimit = bracket.upTo;
        }
        
        tax -= this.PRIMARY_REBATE;
        
        return Math.max(0, tax);
    }
    
    private _getTaxYearForPayPeriod(payPeriod: string): number {
        const [year, month] = payPeriod.split('-').map(Number);
        return month >= 3 ? year : year - 1;
    }

    public async getPreapprovedItems() {
        return await MPreapprovedItems.find() as IPreapprovedItem[] | null;
    }

    public async getPayslipHistory(userId: Types.ObjectId) {
        return await MPayslip.find({ userId }).sort({ payPeriod: -1 });
    }

    public async addQueryNote(payslipId: Types.ObjectId, itemId: string, note: string) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        payslip.notes.push({
            itemId,
            note,
            resolved: false
        });

        await payslip.save();
        return payslip;
    }

    public async updateQueryNote(payslipId: Types.ObjectId, queryId: string, note: string) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        const queryNote = payslip.notes.find(n => n._id?.toString() === queryId);
        if (!queryNote) {
            throw new Error('Query not found');
        }

        queryNote.note = note;
        await payslip.save();
        return payslip;
    }

    public async deleteQueryNote(payslipId: Types.ObjectId, queryId: string) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        const queryIndex = payslip.notes.findIndex(n => n._id?.toString() === queryId);
        if (queryIndex === -1) {
            throw new Error('Query not found');
        }

        payslip.notes.splice(queryIndex, 1);
        await payslip.save();
        return payslip;
    }

    public async resolveQueryNote(payslipId: Types.ObjectId, queryId: string) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        const queryNote = payslip.notes.find(n => n._id?.toString() === queryId);
        if (!queryNote) {
            throw new Error('Query not found');
        }

        queryNote.resolved = true;
        await payslip.save();
        return payslip;
    }

    public async addBonus(payslipId: Types.ObjectId, description: string, amount: number) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        if (payslip.status !== EPayslipStatus.DRAFT) {
            throw new Error('Can only modify draft payslips');
        }

        if (!payslip.bonuses) {
            payslip.bonuses = [];
        }

        payslip.bonuses.push({ description, amount });
        await payslip.save();

        await this.recalculatePayslip(payslip._id as unknown as Types.ObjectId);
        return await MPayslip.findById(payslipId);
    }

    public async removeBonus(payslipId: Types.ObjectId, bonusIndex: number) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        if (payslip.status !== EPayslipStatus.DRAFT) {
            throw new Error('Can only modify draft payslips');
        }

        if (bonusIndex < 0 || bonusIndex >= payslip.bonuses.length) {
            throw new Error('Invalid bonus index');
        }

        payslip.bonuses.splice(bonusIndex, 1);
        await payslip.save();

        await this.recalculatePayslip(payslip._id as unknown as Types.ObjectId);
        return await MPayslip.findById(payslipId);
    }

    public async addDeduction(payslipId: Types.ObjectId, description: string, amount: number) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        if (payslip.status !== EPayslipStatus.DRAFT) {
            throw new Error('Can only modify draft payslips');
        }

        if (!payslip.deductions) {
            payslip.deductions = [];
        }

        payslip.deductions.push({ description, amount });
        await payslip.save();

        await this.recalculatePayslip(payslip._id as unknown as Types.ObjectId);
        return await MPayslip.findById(payslipId);
    }

    public async updateDeduction(payslipId: Types.ObjectId, deductionIndex: number, description: string, amount: number) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        if (payslip.status !== EPayslipStatus.DRAFT) {
            throw new Error('Can only modify draft payslips');
        }

        if (deductionIndex < 0 || deductionIndex >= payslip.deductions.length) {
            throw new Error('Invalid deduction index');
        }

        payslip.deductions[deductionIndex] = { description, amount };
        await payslip.save();

        await this.recalculatePayslip(payslip._id as unknown as Types.ObjectId);
        return await MPayslip.findById(payslipId);
    }

    public async removeDeduction(payslipId: Types.ObjectId, deductionIndex: number) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        if (payslip.status !== EPayslipStatus.DRAFT) {
            throw new Error('Can only modify draft payslips');
        }

        if (deductionIndex < 0 || deductionIndex >= payslip.deductions.length) {
            throw new Error('Invalid deduction index');
        }

        payslip.deductions.splice(deductionIndex, 1);
        await payslip.save();

        await this.recalculatePayslip(payslip._id as unknown as Types.ObjectId);
        return await MPayslip.findById(payslipId);
    }

    public async addMiscEarning(payslipId: Types.ObjectId, description: string, amount: number) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        if (payslip.status !== EPayslipStatus.DRAFT) {
            throw new Error('Can only modify draft payslips');
        }

        if (!payslip.miscEarnings) {
            payslip.miscEarnings = [];
        }

        payslip.miscEarnings.push({ description, amount });
        await payslip.save();

        await this.recalculatePayslip(payslip._id as unknown as Types.ObjectId);
        return await MPayslip.findById(payslipId);
    }

    public async updateMiscEarning(payslipId: Types.ObjectId, earningIndex: number, description: string, amount: number) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        if (payslip.status !== EPayslipStatus.DRAFT) {
            throw new Error('Can only modify draft payslips');
        }

        if (earningIndex < 0 || earningIndex >= payslip.miscEarnings.length) {
            throw new Error('Invalid misc earning index');
        }

        payslip.miscEarnings[earningIndex] = { description, amount };
        await payslip.save();

        await this.recalculatePayslip(payslip._id as unknown as Types.ObjectId);
        return await MPayslip.findById(payslipId);
    }

    public async removeMiscEarning(payslipId: Types.ObjectId, earningIndex: number) {
        const payslip = await MPayslip.findById(payslipId);
        if (!payslip) {
            throw new Error('Payslip not found');
        }

        if (payslip.status !== EPayslipStatus.DRAFT) {
            throw new Error('Can only modify draft payslips');
        }

        if (earningIndex < 0 || earningIndex >= payslip.miscEarnings.length) {
            throw new Error('Invalid misc earning index');
        }

        payslip.miscEarnings.splice(earningIndex, 1);
        await payslip.save();

        await this.recalculatePayslip(payslip._id as unknown as Types.ObjectId);
        return await MPayslip.findById(payslipId);
    }
}

export default Singleton.getInstance(PayslipService);