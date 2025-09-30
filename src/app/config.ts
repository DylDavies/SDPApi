export interface ITaxBracket {
    upTo: number;
    rate: number;
    base: number;
}

export const TaxConfig = {
    UIF_CONTRIBUTION_RATE: 0.01,
    UIF_EARNINGS_CEILING: 17712,
    PRIMARY_REBATE: 17235,
    SECONDARY_REBATE: 9444, // For individuals 65 and older
    TERTIARY_REBATE: 3145,  // For individuals 75 and older
    TAX_THRESHOLDS: {
        UNDER_65: 95750,
        FROM_65_TO_74: 148217,
        OVER_75: 165689,
    },
    TAX_BRACKETS_2025_2026: [
        { upTo: 237100, rate: 0.18, base: 0 },
        { upTo: 370500, rate: 0.26, base: 42678 },
        { upTo: 512800, rate: 0.31, base: 77362 },
        { upTo: 673000, rate: 0.36, base: 121475 },
        { upTo: 857900, rate: 0.39, base: 179147 },
        { upTo: 1817000, rate: 0.41, base: 251258 },
        { upTo: Infinity, rate: 0.45, base: 644489 },
    ] as ITaxBracket[],
};
