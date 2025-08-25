import { UserService } from '../../src/app/services/UserService';
import MUser from '../../src/app/db/models/MUser.model';
import RoleService from '../../src/app/services/RoleService';
import { LoggingService } from '../../src/app/services/LoggingService';
import { Singleton } from '../../src/app/models/classes/Singleton';
import { Types } from 'mongoose';
import { ELeave } from '../../src/app/models/enums/ELeave.enum';

// Mock the modules that UserService depends on.
// This isolates our tests to only the UserService logic.
jest.mock('../../src/app/db/models/MUser.model');
jest.mock('../../src/app/services/RoleService');
jest.mock('../../src/app/services/LoggingService');
jest.mock('../../src/app/models/classes/Singleton');

// Use Jest's utility types for better type-checking with mocks.
const MockedMUser = MUser as jest.Mocked<typeof MUser>;
const MockedSingleton = Singleton as jest.Mocked<typeof Singleton>;

describe('UserService', () => {
    let userService: UserService;
    let mockLogger: jest.Mocked<LoggingService>;
    let mockRoleService: jest.Mocked<typeof RoleService>;

    // This runs before each test, ensuring a clean state.
    beforeEach(() => {
        // Clears any previous mock data and call history.
        jest.clearAllMocks();

        // Create mock instances of the services we need.
        mockLogger = {
            init: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        } as unknown as jest.Mocked<LoggingService>; // FIX: Cast to 'unknown' first to resolve the complex type error.

        mockRoleService = {
            // Also added 'init' here for consistency and good practice.
            init: jest.fn(),
            getDescendantRoleIds: jest.fn(),
        } as unknown as jest.Mocked<typeof RoleService>;

        // Configure the Singleton mock to return our mock instances.
        MockedSingleton.getInstance.mockImplementation((serviceClass: any) => {
            if (serviceClass === LoggingService) {
                return mockLogger;
            }
            if (serviceClass === RoleService) {
                return mockRoleService;
            }
            // This allows the UserService to be instantiated with its mocked dependencies.
            const instance = new serviceClass();
            instance.logger = mockLogger;
            instance.roleService = mockRoleService;
            return instance;
        });

        // Get an instance of the service we are testing.
        userService = Singleton.getInstance(UserService);
    });

    /*describe('addOrUpdateUser', () => {
        it('should create a new user if one does not exist', async () => {
            const userData = { googleId: 'new-google-id', email: 'new@test.com', displayName: 'New User' };
            const expectedUser = { ...userData, _id: new Types.ObjectId() };

            // Mock the database call to return our expected user.
            (MockedMUser.findOneAndUpdate as jest.Mock).mockResolvedValue(expectedUser);

            const result = await userService.addOrUpdateUser(userData);

            expect(MockedMUser.findOneAndUpdate).toHaveBeenCalledWith(
                { googleId: userData.googleId },
                {
                    $set: { email: userData.email, picture: undefined, displayName: userData.displayName },
                    $setOnInsert: { googleId: userData.googleId, firstLogin: true }
                },
                { upsert: true, new: true, runValidators: true }
            );
            expect(result).toEqual(expectedUser);
        });
    });*/

    describe('addLeaveRequest', () => {
        const userId = new Types.ObjectId().toHexString();
        const leaveData = { reason: 'Vacation', startDate: new Date('2023-10-26'), endDate: new Date('2023-10-28') };

        it('should add a leave request to a user', async () => {
            const updatedUser = { _id: userId, leave: [leaveData] };
            (MockedMUser.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedUser);

            const result = await userService.addLeaveRequest(userId, leaveData);

            expect(MockedMUser.findByIdAndUpdate).toHaveBeenCalledWith(
                userId,
                {
                    $push: {
                        leave: {
                            ...leaveData,
                            approved: ELeave.Pending,
                        }
                    }
                },
                { new: true, runValidators: true }
            );
            expect(result).toEqual(updatedUser);
        });

        it('should return null and log a warning for an invalid user ID', async () => {
            const invalidId = 'not-an-object-id';
            const result = await userService.addLeaveRequest(invalidId, leaveData);

            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(`Invalid ID string provided to addLeaveRequest: "${invalidId}"`);
            expect(MockedMUser.findByIdAndUpdate).not.toHaveBeenCalled();
        });
    });

    /*describe('getUser', () => {
        it('should return a user for a valid ID', async () => {
            const userId = new Types.ObjectId().toHexString();
            const mockUser = { _id: userId, name: 'Test' };
            // Mongoose's .populate returns a chainable object, so we mock it that way.
            (MockedMUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockUser),
            });

            const result = await userService.getUser(userId);

            expect(MockedMUser.findById).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockUser);
        });

        it('should return null and log a warning for an invalid ID', async () => {
            const invalidId = 'invalid-id';
            const result = await userService.getUser(invalidId);

            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(`Invalid ID string provided to getUser: "${invalidId}"`);
        });
    });

    describe('assignRoleToUser', () => {
        const performingUserId = new Types.ObjectId().toHexString();
        const targetUserId = new Types.ObjectId().toHexString();
        const roleId = new Types.ObjectId().toHexString();

        it('should assign a role if the performing user has permission', async () => {
            const performingUser = { _id: performingUserId, roles: [new Types.ObjectId()] };
            const updatedTargetUser = { _id: targetUserId, roles: [roleId] };

            (MockedMUser.findById as jest.Mock).mockImplementation(id => {
                if (id === performingUserId) return { populate: jest.fn().mockResolvedValue(performingUser) };
                if (id === targetUserId) return { populate: jest.fn().mockResolvedValue(updatedTargetUser) };
                return null;
            });
            
            mockRoleService.getDescendantRoleIds.mockResolvedValue(new Set([roleId]));
            (MockedMUser.updateOne as jest.Mock).mockResolvedValue({ nModified: 1 });

            const result = await userService.assignRoleToUser(performingUserId, targetUserId, roleId);

            expect(mockRoleService.getDescendantRoleIds).toHaveBeenCalledWith(performingUser.roles);
            expect(MockedMUser.updateOne).toHaveBeenCalledWith({ _id: targetUserId }, { $addToSet: { roles: roleId } });
            expect(result).toEqual(updatedTargetUser);
        });

        it('should throw an error if the role is not a descendant', async () => {
            const performingUser = { _id: performingUserId, roles: [new Types.ObjectId()] };
            (MockedMUser.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(performingUser) });
            // Mock that the roleId is NOT in the set of assignable roles.
            mockRoleService.getDescendantRoleIds.mockResolvedValue(new Set(['some-other-role-id']));

            await expect(userService.assignRoleToUser(performingUserId, targetUserId, roleId))
                .rejects.toThrow("Forbidden: You can only assign roles that are below your own in the hierarchy.");
        });
    });

    describe('removeRoleFromUser', () => {
        const performingUserId = new Types.ObjectId().toHexString();
        const targetUserId = new Types.ObjectId().toHexString();
        const roleId = new Types.ObjectId().toHexString();

        it('should remove a role if the performing user has permission', async () => {
            const performingUser = { _id: performingUserId, roles: [new Types.ObjectId()] };
            const updatedTargetUser = { _id: targetUserId, roles: [] }; // Role has been removed

            (MockedMUser.findById as jest.Mock).mockImplementation(id => {
                if (id === performingUserId) return { populate: jest.fn().mockResolvedValue(performingUser) };
                if (id === targetUserId) return { populate: jest.fn().mockResolvedValue(updatedTargetUser) };
                return null;
            });

            mockRoleService.getDescendantRoleIds.mockResolvedValue(new Set([roleId]));
            (MockedMUser.updateOne as jest.Mock).mockResolvedValue({ nModified: 1 });

            const result = await userService.removeRoleFromUser(performingUserId, targetUserId, roleId);

            expect(mockRoleService.getDescendantRoleIds).toHaveBeenCalledWith(performingUser.roles);
            expect(MockedMUser.updateOne).toHaveBeenCalledWith({ _id: targetUserId }, { $pull: { roles: roleId } });
            expect(result).toEqual(updatedTargetUser);
        });

        it('should throw an error if the performing user is not found', async () => {
            // Mock MUser.findById to return null for the performing user.
            (MockedMUser.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

            await expect(userService.removeRoleFromUser(performingUserId, targetUserId, roleId))
                .rejects.toThrow("Performing user not found.");
        });
    });*/
});
