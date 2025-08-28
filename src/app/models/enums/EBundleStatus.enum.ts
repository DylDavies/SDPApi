/**
 * Represents the various states a bundle can be in,
 * from creation to approval.
 * 0 = Pending
 * 1 = Approved
 * 2 = Denied
 */
export enum EBundleStatus {
    Pending = 'pending',
    Approved = 'approved',
    Denied = 'denied'
}