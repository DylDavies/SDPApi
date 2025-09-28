import { UserService } from '../../src/app/services/UserService';
import MUser from '../../src/app/db/models/MUser.model';
import roleService, {RoleService} from '../../src/app/services/RoleService';
import notificationService from '../../src/app/services/NotificationService';
import { Types } from 'mongoose';
import { ELeave } from '../../src/app/models/enums/ELeave.enum';

// Mock all external dependencies
jest.mock('../../src/app/db/models/MUser.model');
jest.mock('../../src/app/services/RoleService');
jest.mock('../../src/app/services/NotificationService');
jest.mock('../../src/app/services/LoggingService');

describe('UserService', () => {
    let userService: UserService;
    let mockRoleService: jest.Mocked<RoleService>;

    beforeEach(() => {
        // Clear all mocks and reset implementations before each test
        jest.clearAllMocks();
        // Instead of mocking the whole library, we spy on the specific method we need to control.
        jest.spyOn(Types.ObjectId, 'isValid').mockReturnValue(true);

        // Get fresh instances for each test
        userService = new UserService();
        mockRoleService = roleService as jest.Mocked<RoleService>;
    });

    describe('addOrUpdateUser', () => {
        it('should create or update a user and return the user document', async () => {
            const userData = { googleId: '123', email: 'test@test.com', displayName: 'Test User', picture: 'pic.jpg' };
            const expectedUser = { ...userData, _id: 'mongoId' };
            (MUser.findOneAndUpdate as jest.Mock).mockResolvedValue(expectedUser);

            const result = await userService.addOrUpdateUser(userData);

            expect(MUser.findOneAndUpdate).toHaveBeenCalledWith(
                { googleId: userData.googleId },
                {
                    $set: { email: userData.email, picture: userData.picture, displayName: userData.displayName },
                    $setOnInsert: { googleId: userData.googleId, firstLogin: true }
                },
                { upsert: true, new: true, runValidators: true }
            );
            expect(result).toEqual(expectedUser);
        });
    });

    describe('addLeaveRequest', () => {
        it('should add a leave request to a user', async () => {
            const leaveData = { reason: 'Vacation', startDate: new Date(), endDate: new Date() };
            (MUser.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: 'user123' });

            await userService.addLeaveRequest('user123', leaveData);

            expect(MUser.findByIdAndUpdate).toHaveBeenCalledWith(
                'user123',
                expect.objectContaining({ $push: { leave: expect.any(Object) } }),
                expect.any(Object)
            );
        });

        it('should return null for an invalid user ID', async () => {
            // Control the spy directly for this test case
            (Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);
            const result = await userService.addLeaveRequest('invalid-id', {} as any);
            expect(result).toBeNull();
        });
    });

    describe('updateLeaveRequestStatus', () => {
        it('should update a leave request, send notification, and save the user', async () => {
            const leaveRequestId = '507f1f77bcf86cd799439011';
            const leaveRequest = {
                _id: { toString: () => leaveRequestId },
                reason: 'Sick',
                startDate: new Date(),
                endDate: new Date(),
                approved: ELeave.Pending
            };
            const mockUser = {
                displayName: 'Test',
                leave: [leaveRequest],
                save: jest.fn().mockResolvedValue(true),
                markModified: jest.fn()
            };

            (MUser.findOne as jest.Mock).mockResolvedValue(mockUser);

            await userService.updateLeaveRequestStatus('user123', leaveRequestId, ELeave.Approved);

            expect(notificationService.createNotification).toHaveBeenCalled();
            expect(mockUser.markModified).toHaveBeenCalledWith('leave');
            expect(mockUser.save).toHaveBeenCalled();
            expect(leaveRequest.approved).toBe(ELeave.Approved);
        });

        it('should return null if user or leave request is not found', async () => {
            (MUser.findOne as jest.Mock).mockResolvedValue(null);
            const result = await userService.updateLeaveRequestStatus('user123', 'leave123', ELeave.Approved);
            expect(result).toBeNull();
        });

        it('should return null if leave request is not found on the user object', async () => {
            const mockUser = {
                displayName: 'Test',
                leave: [], // Empty leave array
                save: jest.fn(),
                markModified: jest.fn()
            };
            (MUser.findOne as jest.Mock).mockResolvedValue(mockUser);
            const result = await userService.updateLeaveRequestStatus('user123', 'leave123', ELeave.Approved);
            expect(result).toBeNull();
        });
    });

    describe('getUser', () => {
        it('should retrieve a user and their aggregated permissions', async () => {
            const mockUser = {
                _doc: { roles: [] },
                roles: [
                    { permissions: ['perm1', 'perm2'] },
                    { permissions: ['perm2', 'perm3'] }
                ]
            };
            (MUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockUser)
            });

            const result = await userService.getUser('user123');

            expect(result?.permissions).toEqual(['perm1', 'perm2', 'perm3']);
        });

        it('should return null if user is not found', async () => {
            (MUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });
            const result = await userService.getUser('user123');
            expect(result).toBeNull();
        });
    });
    
    describe('editUser', () => {
        it('should update user data and set firstLogin to false', async () => {
            const updateData = { displayName: 'New Name' };
            (MUser.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: 'user123', ...updateData });

            await userService.editUser('user123', updateData);

            expect(MUser.findByIdAndUpdate).toHaveBeenCalledWith('user123', { $set: { ...updateData, firstLogin: false } }, expect.any(Object));
        });
    });

    describe('assignRoleToUser', () => {
        it('should assign a role if the performing user has hierarchical permission', async () => {
            const mockPerformingUser = { roles: ['roleA'] };
            (MUser.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(mockPerformingUser) });
            mockRoleService.getDescendantRoleIds.mockResolvedValue(new Set(['roleB']));
            (MUser.updateOne as jest.Mock).mockResolvedValue({ });
            (MUser.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue({}) });


            await userService.assignRoleToUser('performingUser', 'targetUser', 'roleB');
            
            expect(MUser.updateOne).toHaveBeenCalledWith({ _id: 'targetUser' }, { $addToSet: { roles: 'roleB' } });
        });

        it('should throw an error if the performing user lacks permission', async () => {
            const mockPerformingUser = { roles: ['roleA'] };
            (MUser.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(mockPerformingUser) });
            mockRoleService.getDescendantRoleIds.mockResolvedValue(new Set(['roleC'])); // Does not have roleB

            await expect(userService.assignRoleToUser('performingUser', 'targetUser', 'roleB')).rejects.toThrow();
        });
    });

    describe('removeRoleFromUser', () => {
        it('should remove a role if the performing user has hierarchical permission', async () => {
            const mockPerformingUser = { roles: ['roleA'] };
            (MUser.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(mockPerformingUser) });
            mockRoleService.getDescendantRoleIds.mockResolvedValue(new Set(['roleB']));
            (MUser.updateOne as jest.Mock).mockResolvedValue({ });
            (MUser.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue({}) });

            await userService.removeRoleFromUser('performingUser', 'targetUser', 'roleB');
            
            expect(MUser.updateOne).toHaveBeenCalledWith({ _id: 'targetUser' }, { $pull: { roles: 'roleB' } });
        });

        it('should throw an error if the performing user lacks permission', async () => {
            const mockPerformingUser = { roles: ['roleA'] };
            (MUser.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(mockPerformingUser) });
            mockRoleService.getDescendantRoleIds.mockResolvedValue(new Set(['roleC']));

            await expect(userService.removeRoleFromUser('performingUser', 'targetUser', 'roleB')).rejects.toThrow();
        });
    });

    // Simple status update methods
    ['approveUser', 'disableUser', 'enableUser'].forEach((methodName) => {
        describe(methodName, () => {
            it('should call updateOne with the correct status change', async () => {
                const expectedUpdate = {
                    approveUser: { pending: false },
                    disableUser: { disabled: true },
                    enableUser: { disabled: false },
                }[methodName as "approveUser" | "disableUser" | "enableUser"];
                
                (MUser.updateOne as jest.Mock).mockResolvedValue({});
                (MUser.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue({}) });

                await (userService as any)[methodName]('targetUser');

                expect(MUser.updateOne).toHaveBeenCalledWith({ _id: 'targetUser' }, { $set: expectedUpdate });
            });
        });
    });

    describe('getAllUsers', () => {
        it('should call MUser.find and populate roles, proficiencies and badges', async () => {
            const findMock = { populate: jest.fn().mockResolvedValue([]) };
            (MUser.find as jest.Mock).mockReturnValue(findMock);

            await userService.getAllUsers();

            expect(MUser.find).toHaveBeenCalled();
            expect(findMock.populate).toHaveBeenCalledWith(['roles', 'proficiencies', { path: 'badges.badge' }]);
        });
    });

    describe('addBadgeToUser', () => {
        it('should add a badge to a user', async () => {
            const badgeId = new Types.ObjectId().toHexString();
            (MUser.findByIdAndUpdate as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue({ _id: 'user123' })
            });

            await userService.addBadgeToUser('user123', badgeId);

            expect(MUser.findByIdAndUpdate).toHaveBeenCalledWith(
                'user123',
                expect.objectContaining({ $push: { badges: expect.any(Object) } }),
                { new: true }
            );
        });
    });

    describe('removeBadgeFromUser', () => {
        it('should remove a badge from a user', async () => {
            const badgeId = new Types.ObjectId().toHexString();
            (MUser.findByIdAndUpdate as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue({ _id: 'user123' })
            });

            await userService.removeBadgeFromUser('user123', badgeId);

            expect(MUser.findByIdAndUpdate).toHaveBeenCalledWith(
                'user123',
                { $pull: { badges: { badge: new Types.ObjectId(badgeId) } } },
                { new: true }
            );
        });
    });
    
    describe('addOrUpdateProficiency', () => {
        it('should return null if user is not found', async () => {
            (MUser.findById as jest.Mock).mockResolvedValue(null);
            const result = await userService.addOrUpdateProficiency('user123', {} as any);
            expect(result).toBeNull();
        });
    });

});