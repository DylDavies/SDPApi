import { UserService } from '../../src/app/services/UserService';
import MUser from '../../src/app/db/models/MUser.model';
import roleService, {RoleService} from '../../src/app/services/RoleService';
import notificationService from '../../src/app/services/NotificationService';
import { Types } from 'mongoose';
import { ELeave } from '../../src/app/models/enums/ELeave.enum';
import { EUserType } from '../../src/app/models/enums/EUserType.enum';

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
                    $set: { email: userData.email, picture: userData.picture },
                    $setOnInsert: { googleId: userData.googleId, displayName: userData.displayName, firstLogin: true }
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

        it('should add a new proficiency to user', async () => {
            const profData: any = {
                name: 'Mathematics',
                subjects: {
                    'algebra': { _id: new Types.ObjectId('507f1f77bcf86cd799439011'), name: 'Algebra', description: 'Math' }
                }
            };
            const mockUser = {
                _id: 'user123',
                proficiencies: [],
                save: jest.fn().mockResolvedValue(true),
                markModified: jest.fn()
            };
            (MUser.findById as jest.Mock).mockResolvedValue(mockUser);
            (MUser.findById as jest.Mock).mockReturnValueOnce(mockUser);
            (MUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({ _id: 'user123', proficiencies: [profData] })
                })
            });

            await userService.addOrUpdateProficiency('user123', profData);

            expect(mockUser.proficiencies.length).toBe(1);
            expect(mockUser.markModified).toHaveBeenCalledWith('proficiencies');
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should update existing proficiency', async () => {
            const profData: any = {
                name: 'Mathematics',
                subjects: {
                    'calculus': { _id: new Types.ObjectId('507f1f77bcf86cd799439012'), name: 'Calculus', description: 'Advanced' }
                }
            };
            const existingProf = {
                name: 'Mathematics',
                subjects: new Map([['algebra', { _id: new Types.ObjectId('507f1f77bcf86cd799439011'), name: 'Algebra' }]])
            };
            const mockUser = {
                _id: 'user123',
                proficiencies: [existingProf],
                save: jest.fn().mockResolvedValue(true),
                markModified: jest.fn()
            };
            (MUser.findById as jest.Mock).mockResolvedValueOnce(mockUser);
            (MUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({ _id: 'user123' })
                })
            });

            await userService.addOrUpdateProficiency('user123', profData);

            expect(existingProf.subjects.has('calculus')).toBe(true);
            expect(mockUser.markModified).toHaveBeenCalledWith('proficiencies');
            expect(mockUser.save).toHaveBeenCalled();
        });
    });

    describe('deleteProficiency', () => {
        it('should delete a proficiency from user', async () => {
            const mockUser = { _id: 'user123', proficiencies: [] };
            (MUser.findByIdAndUpdate as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockUser)
            });

            await userService.deleteProficiency('user123', 'Mathematics');

            expect(MUser.findByIdAndUpdate).toHaveBeenCalledWith(
                'user123',
                { $pull: { proficiencies: { name: 'Mathematics' } } },
                { new: true }
            );
        });

        it('should return null if user is not found', async () => {
            (MUser.findByIdAndUpdate as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            const result = await userService.deleteProficiency('invalid-id', 'Math');

            expect(result).toBeNull();
        });
    });

    describe('deleteSubject', () => {
        it('should delete a subject from user proficiency', async () => {
            const mockSubject = { _id: new Types.ObjectId('507f1f77bcf86cd799439011'), name: 'Algebra' };
            const proficiency = {
                name: 'Mathematics',
                subjects: new Map([['algebra', mockSubject]])
            };
            const mockUser = {
                _id: 'user123',
                proficiencies: [proficiency],
                save: jest.fn().mockResolvedValue(true),
                markModified: jest.fn()
            };
            (MUser.findById as jest.Mock).mockResolvedValueOnce(mockUser);
            (MUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({ _id: 'user123' })
                })
            });

            await userService.deleteSubject('user123', 'Mathematics', '507f1f77bcf86cd799439011');

            expect(proficiency.subjects.size).toBe(0);
            expect(mockUser.markModified).toHaveBeenCalledWith('proficiencies');
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should return null if user is not found', async () => {
            (MUser.findById as jest.Mock).mockResolvedValue(null);

            const result = await userService.deleteSubject('invalid-id', 'Math', 'sub-123');

            expect(result).toBeNull();
        });

        it('should handle proficiency not found', async () => {
            const mockUser = {
                _id: 'user123',
                proficiencies: [],
                save: jest.fn().mockResolvedValue(true),
                markModified: jest.fn()
            };
            (MUser.findById as jest.Mock).mockResolvedValueOnce(mockUser);
            (MUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({ _id: 'user123' })
                })
            });

            const result = await userService.deleteSubject('user123', 'NonExistent', 'sub-123');

            // Should still save but won't find the proficiency, so just check save was called
            expect(result).toBeTruthy();
        });
    });

    describe('updateUserType', () => {
        it('should update user type', async () => {
            const mockUser = { _id: 'user123', type: EUserType.Client };
            (MUser.updateOne as jest.Mock).mockResolvedValue({});
            (MUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockUser)
            });

            await userService.updateUserType('user123', EUserType.Client);

            expect(MUser.updateOne).toHaveBeenCalledWith(
                { _id: 'user123' },
                { $set: { type: EUserType.Client } }
            );
        });
    });

    describe('updateAvailability', () => {
        it('should update user availability', async () => {
            const mockUser = { _id: 'user123', availability: 20 };
            (MUser.findByIdAndUpdate as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockUser)
            });

            const result = await userService.updateAvailability('user123', 20);

            expect(MUser.findByIdAndUpdate).toHaveBeenCalledWith(
                'user123',
                { $set: { availability: 20 } },
                { new: true, runValidators: true }
            );
            expect(result).toEqual(mockUser);
        });

        it('should return null for invalid user ID', async () => {
            (Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);

            const result = await userService.updateAvailability('invalid-id', 20);

            expect(result).toBeNull();
        });
    });

    describe('updateUserPreferences', () => {
        it('should update user theme preference', async () => {
            (MUser.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

            await userService.updateUserPreferences('user123', { theme: 'dark' });

            expect(MUser.findByIdAndUpdate).toHaveBeenCalledWith(
                'user123',
                { $set: { theme: 'dark' } }
            );
        });
    });

    describe('cleanupExpiredBadges', () => {
        it('should remove expired temporary badges', async () => {
            const expiredDate = new Date('2020-01-01');
            const mockBadge = {
                _id: 'badge-123',
                name: 'Test Badge',
                permanent: false,
                duration: 30 // 30 days
            };
            const mockUserBadge = {
                badge: mockBadge,
                dateAdded: expiredDate
            };
            const mockUser = {
                _id: 'user123',
                displayName: 'Test User',
                badges: [mockUserBadge],
                save: jest.fn().mockResolvedValue(true)
            };
            (MUser.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue([mockUser])
            });

            await userService.cleanupExpiredBadges();

            expect(mockUser.badges.length).toBe(0);
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should keep permanent badges', async () => {
            const mockBadge = {
                _id: 'badge-456',
                name: 'Permanent Badge',
                permanent: true,
                duration: null
            };
            const mockUserBadge = {
                badge: mockBadge,
                dateAdded: new Date('2020-01-01')
            };
            const mockUser = {
                _id: 'user123',
                displayName: 'Test User',
                badges: [mockUserBadge],
                save: jest.fn().mockResolvedValue(true)
            };
            (MUser.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue([mockUser])
            });

            await userService.cleanupExpiredBadges();

            expect(mockUser.badges.length).toBe(1);
            expect(mockUser.save).not.toHaveBeenCalled();
        });

        it('should keep non-expired temporary badges', async () => {
            const recentDate = new Date();
            const mockBadge = {
                _id: 'badge-789',
                name: 'Recent Badge',
                permanent: false,
                duration: 365 // 1 year
            };
            const mockUserBadge = {
                badge: mockBadge,
                dateAdded: recentDate
            };
            const mockUser = {
                _id: 'user123',
                displayName: 'Test User',
                badges: [mockUserBadge],
                save: jest.fn().mockResolvedValue(true)
            };
            (MUser.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue([mockUser])
            });

            await userService.cleanupExpiredBadges();

            expect(mockUser.badges.length).toBe(1);
            expect(mockUser.save).not.toHaveBeenCalled();
        });
    });

    describe('addRateAdjustment', () => {
        it('should add a rate adjustment to user', async () => {
            const managerId = '507f1f77bcf86cd799439011';
            const rateAdjustment = {
                reason: 'Performance increase',
                newRate: 25,
                effectiveDate: new Date(),
                approvingManagerId: managerId
            };
            const mockUser: any = {
                _id: 'user123',
                displayName: 'Test User',
                email: 'test@test.com',
                rateAdjustments: [],
                save: jest.fn().mockResolvedValue(true)
            };
            const mockManager = {
                _id: managerId,
                displayName: 'Manager Name'
            };
            (MUser.findById as jest.Mock).mockResolvedValueOnce(mockUser);
            (MUser.findById as jest.Mock).mockResolvedValueOnce(mockManager);

            await userService.addRateAdjustment('user123', rateAdjustment);

            expect(mockUser.rateAdjustments.length).toBe(1);
            expect(mockUser.rateAdjustments[0].newRate).toBe(25);
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should sort rate adjustments by date', async () => {
            const oldDate = new Date('2020-01-01');
            const newDate = new Date('2023-01-01');
            const managerId = '507f1f77bcf86cd799439012';
            const rateAdjustment = {
                reason: 'New adjustment',
                newRate: 30,
                effectiveDate: newDate,
                approvingManagerId: managerId
            };
            const mockUser: any = {
                _id: 'user123',
                displayName: 'Test User',
                email: 'test@test.com',
                rateAdjustments: [
                    {
                        reason: 'Old adjustment',
                        newRate: 20,
                        effectiveDate: oldDate,
                        approvingManagerId: new Types.ObjectId(managerId)
                    }
                ],
                save: jest.fn().mockResolvedValue(true)
            };
            const mockManager = {
                _id: managerId,
                displayName: 'Manager Name'
            };
            (MUser.findById as jest.Mock).mockResolvedValueOnce(mockUser);
            (MUser.findById as jest.Mock).mockResolvedValueOnce(mockManager);

            await userService.addRateAdjustment('user123', rateAdjustment);

            expect(mockUser.rateAdjustments[0].newRate).toBe(30); // Most recent first
            expect(mockUser.rateAdjustments[1].newRate).toBe(20);
        });

        it('should throw error if user not found', async () => {
            (MUser.findById as jest.Mock).mockResolvedValue(null);

            await expect(
                userService.addRateAdjustment('invalid-id', {} as any)
            ).rejects.toThrow('User not found');
        });
    });

    describe('removeRateAdjustment', () => {
        it('should remove a rate adjustment by index', async () => {
            const managerId = '507f1f77bcf86cd799439013';
            const mockUser: any = {
                _id: 'user123',
                displayName: 'Test User',
                email: 'test@test.com',
                rateAdjustments: [
                    {
                        reason: 'First',
                        newRate: 20,
                        effectiveDate: new Date(),
                        approvingManagerId: new Types.ObjectId(managerId)
                    },
                    {
                        reason: 'Second',
                        newRate: 25,
                        effectiveDate: new Date(),
                        approvingManagerId: new Types.ObjectId(managerId)
                    }
                ],
                save: jest.fn().mockResolvedValue(true)
            };
            (MUser.findById as jest.Mock).mockResolvedValue(mockUser);

            await userService.removeRateAdjustment('user123', 0);

            expect(mockUser.rateAdjustments.length).toBe(1);
            expect(mockUser.rateAdjustments[0].reason).toBe('Second');
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should throw error if user not found', async () => {
            (MUser.findById as jest.Mock).mockResolvedValue(null);

            await expect(
                userService.removeRateAdjustment('invalid-id', 0)
            ).rejects.toThrow('User not found');
        });

        it('should throw error if adjustment index is invalid', async () => {
            const mockUser = {
                _id: 'user123',
                displayName: 'Test User',
                email: 'test@test.com',
                rateAdjustments: [],
                save: jest.fn().mockResolvedValue(true)
            };
            (MUser.findById as jest.Mock).mockResolvedValue(mockUser);

            await expect(
                userService.removeRateAdjustment('user123', 0)
            ).rejects.toThrow('Rate adjustment not found');
        });
    });

    describe('getUser', () => {
        it('should return null for invalid user ID', async () => {
            (Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);

            const result = await userService.getUser('invalid-id');

            expect(result).toBeNull();
        });
    });

    describe('editUser', () => {
        it('should return null for invalid user ID', async () => {
            (Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);

            const result = await userService.editUser('invalid-id', { displayName: 'New Name' });

            expect(result).toBeNull();
        });
    });

    describe('updateLeaveRequestStatus', () => {
        it('should return null for invalid user ID', async () => {
            (Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);

            const result = await userService.updateLeaveRequestStatus('invalid-id', 'leave-123', ELeave.Approved);

            expect(result).toBeNull();
        });

        it('should return null for invalid leave ID', async () => {
            (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);

            const result = await userService.updateLeaveRequestStatus('user-123', 'invalid-leave-id', ELeave.Approved);

            expect(result).toBeNull();
        });
    });

    describe('assignRoleToUser', () => {
        it('should allow admin to assign any role', async () => {
            const mockPerformingUser = { roles: ['roleA'] };
            (MUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockPerformingUser)
            });
            mockRoleService.getDescendantRoleIds.mockResolvedValue(new Set(['roleC'])); // Does not include roleB
            (MUser.updateOne as jest.Mock).mockResolvedValue({});

            // isAdmin = true should bypass hierarchy check
            await userService.assignRoleToUser('performingUser', 'targetUser', 'roleB', true);

            expect(MUser.updateOne).toHaveBeenCalledWith(
                { _id: 'targetUser' },
                { $addToSet: { roles: 'roleB' } }
            );
        });
    });

    describe('removeRoleFromUser', () => {
        it('should allow admin to remove any role', async () => {
            const mockPerformingUser = { roles: ['roleA'] };
            (MUser.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockPerformingUser)
            });
            mockRoleService.getDescendantRoleIds.mockResolvedValue(new Set(['roleC'])); // Does not include roleB
            (MUser.updateOne as jest.Mock).mockResolvedValue({});

            // isAdmin = true should bypass hierarchy check
            await userService.removeRoleFromUser('performingUser', 'targetUser', 'roleB', true);

            expect(MUser.updateOne).toHaveBeenCalledWith(
                { _id: 'targetUser' },
                { $pull: { roles: 'roleB' } }
            );
        });
    });

});