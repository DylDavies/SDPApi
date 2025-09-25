import { Request, Response, NextFunction } from 'express';
import { EPermission } from '../models/enums/EPermission.enum';
import IPayloadUser from '../models/interfaces/IPayloadUser.interface';
import { EUserType } from '../models/enums/EUserType.enum';
import UserService from '../services/UserService';

/**
 * A middleware factory that creates a permission-checking middleware.
 * It checks if the authenticated user's JWT payload contains the required permission(s).
 *
 * @param requiredPermissions A single permission or an array of permissions required to access the route.
 * @returns An Express middleware function.
 */
export function hasPermission(requiredPermissions: EPermission | EPermission[], requireAll: boolean = true) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return false;
        const user = await UserService.getUser((req.user as IPayloadUser).id);

        if (user && user.type == EUserType.Admin) return next();

        if (!user || !user.permissions) {
            return res.status(403).send('Forbidden: You do not have the necessary permissions.');
        }

        const userPermissions = new Set(user.permissions);
        const permissionsToCheck = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

        const hasPermissions = requireAll ? permissionsToCheck.every(p => userPermissions.has(p)) : permissionsToCheck.some(p => userPermissions.has(p));

        if (hasPermissions) {
            return next(); // User has all required permissions, proceed.
        }

        return res.status(403).send('Forbidden: You do not have the necessary permissions.');
    };
}
