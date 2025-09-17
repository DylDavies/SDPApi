/**
 * Represents the various states a bundle can be in,
 * from creation to approval.
 * 0 = Active
 * 1 = Completed
 * 2 = Achieved
 * 3 = Failed
 */
export enum EMissionStatus {
    Active = 'active',
    InActive = 'inactive',
    Completed = 'completed',
    Achieved = 'achieved',
    Failed = 'failed'
}