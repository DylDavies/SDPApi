import { EPermission } from '../enums/EPermission.enum';
import { EUserType } from '../enums/EUserType.enum';

/**
 * Defines the shape of the data stored in the JWT payload.
 * This is the "passport" for the user, containing all essential, non-sensitive
 * information needed to verify their identity and permissions on subsequent API requests.
 */
export default interface IPayloadUser {
    id: string;
    email: string;
    displayName: string;
    firstLogin: boolean;
    permissions: EPermission[];
    type: EUserType;
}
