import { EItemType } from '../enums/EItemType.enum';

export interface IPreapprovedItem {
    itemName: string;
    itemType: EItemType;
    defaultAmount: number;
    isAdminOnly: boolean;
}