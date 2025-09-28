import { IService } from '../models/interfaces/IService.interface';
import { EServiceLoadPriority } from '../models/enums/EServiceLoadPriority.enum';
import { TaxConfig } from '../config';
import { Singleton } from '../models/classes/Singleton';

export class ConfigService implements IService {
    public loadPriority: EServiceLoadPriority = EServiceLoadPriority.High; // Load config early
    public serviceName: string = 'ConfigService';

    public tax = {
        uifRate: TaxConfig.UIF_CONTRIBUTION_RATE,
        uifCeiling: TaxConfig.UIF_EARNINGS_CEILING,
        primaryRebate: TaxConfig.PRIMARY_REBATE,
        secondaryRebate: TaxConfig.SECONDARY_REBATE,
        tertiaryRebate: TaxConfig.TERTIARY_REBATE,
        taxThresholds: TaxConfig.TAX_THRESHOLDS,
        taxBrackets: TaxConfig.TAX_BRACKETS_2025_2026,
    };

    public async init(): Promise<void> {
        // In the future, this could load values from a database
    }

    public async initialize(): Promise<void> {}
}

export default Singleton.getInstance(ConfigService);