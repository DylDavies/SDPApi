/**
 * Represents the various states a bundle can be in,
 * from creation to approval.
 * 0 = Pending
 * 1 = Approved
 * 2 = Denied
 */
export enum EBundleStatus {
    Pending = 0,
    Approved = 1,
    Denied = 2
}