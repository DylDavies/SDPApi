import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../src/app/middleware/permission.middleware';
import UserService from '../../src/app/services/UserService';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';
import IPayloadUser from '../../src/app/models/interfaces/IPayloadUser.interface';
import { IUserWithPermissions } from '../../src/app/db/models/MUser.model';

// Mock UserService
jest.mock('../../src/app/services/UserService');

describe('hasPermission Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const nextFunction: NextFunction = jest.fn();
    let statusMock: jest.Mock;
    let sendMock: jest.Mock;

    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        sendMock = jest.fn();
        mockRequest = {
            user: { id: 'userId' } as IPayloadUser,
        };
        mockResponse = {
            status: statusMock,
            send: sendMock,
        };
        jest.clearAllMocks();
    });

    it('should call next() if user is an admin', async () => {
        (UserService.getUser as jest.Mock).mockResolvedValue({ type: EUserType.Admin });
        const middleware = hasPermission(EPermission.ROLES_CREATE);
        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
    });

    it('should call next() if user has the required permission', async () => {
        (UserService.getUser as jest.Mock).mockResolvedValue({
            type: EUserType.Staff,
            permissions: [EPermission.ROLES_CREATE],
        } as IUserWithPermissions);
        const middleware = hasPermission(EPermission.ROLES_CREATE);
        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
    });

    it('should send 403 if user does not have the required permission', async () => {
        (UserService.getUser as jest.Mock).mockResolvedValue({
            type: EUserType.Staff,
            permissions: [EPermission.ROLES_VIEW],
        } as IUserWithPermissions);
        const middleware = hasPermission(EPermission.ROLES_CREATE);
        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.send).toHaveBeenCalledWith('Forbidden: You do not have the necessary permissions.');
    });

    it('should send 403 if user has no permissions property', async () => {
        (UserService.getUser as jest.Mock).mockResolvedValue({
            type: EUserType.Staff,
        } as IUserWithPermissions);
        const middleware = hasPermission(EPermission.ROLES_CREATE);
        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should handle an array of required permissions', async () => {
        (UserService.getUser as jest.Mock).mockResolvedValue({
            type: EUserType.Staff,
            permissions: [EPermission.ROLES_CREATE, EPermission.ROLES_EDIT],
        } as IUserWithPermissions);
        const middleware = hasPermission([EPermission.ROLES_CREATE, EPermission.ROLES_EDIT]);
        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
    });
});