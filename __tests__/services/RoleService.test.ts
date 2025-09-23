import { Types } from 'mongoose';
import { EPermission } from '../../src/app/models/enums/EPermission.enum';

// --- MOCKING STRATEGY ---
// We provide a factory function to jest.mock. This function returns the mock implementation for the entire module.
// This prevents Jest from trying to execute the real MRole.model.ts file, which avoids the Mongoose initialization error.

const MRoleMock = {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
};
const MUserMock = {
    countDocuments: jest.fn(),
};

// Mock the entire module, returning a mock constructor that also has the mocked static methods.
jest.mock('../../src/app/db/models/MRole.model', () => {
    const mockConstructor = jest.fn();
    return Object.assign(mockConstructor, MRoleMock);
});
jest.mock('../../src/app/db/models/MUser.model', () => {
    const mockConstructor = jest.fn();
    return Object.assign(mockConstructor, MUserMock);
});


// --- TEST SETUP ---
// We can now safely import the service. It will receive our fully mocked dependencies.
import { RoleService } from '../../src/app/services/RoleService';
import MRole from '../../src/app/db/models/MRole.model';
import MUser from '../../src/app/db/models/MUser.model';

describe('RoleService', () => {
    let roleService: RoleService;

    beforeEach(() => {
        // Clear all mock implementations and calls before each test
        jest.clearAllMocks();
        
        // Configure the default behavior for the MRole constructor ('new MRole()')
        (MRole as unknown as jest.Mock).mockImplementation((data: any) => ({
            ...data,
            save: jest.fn().mockResolvedValue(data),
        }));

        roleService = new RoleService();
    });

    describe('createRole', () => {
        it('should create a new role with a parent', async () => {
            const roleData = {
                name: 'Test Role',
                permissions: [EPermission.DASHBOARD_VIEW],
                parentId: new Types.ObjectId().toHexString(),
                color: '#ffffff'
            };
            await roleService.createRole(roleData.name, roleData.permissions, roleData.parentId, roleData.color);
            
            expect(MRole).toHaveBeenCalledWith(expect.objectContaining({
                name: roleData.name,
                parent: new Types.ObjectId(roleData.parentId)
            }));
        });

        it('should create a new root role without a parent', async () => {
            await roleService.createRole('Root Role', [], null, '#000000');
            expect(MRole).toHaveBeenCalledWith(expect.objectContaining({ name: 'Root Role', parent: null }));
        });
    });

    describe('updateRole', () => {
        it('should find and update a role', async () => {
            const roleId = new Types.ObjectId().toHexString();
            const updateData = { name: 'Updated', permissions: [], parentId: null, color: '#123456' };
            (MRole.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: roleId, ...updateData });

            await roleService.updateRole(roleId, updateData.name, updateData.permissions, updateData.parentId, updateData.color);
            
            expect(MRole.findByIdAndUpdate).toHaveBeenCalledWith(roleId, expect.any(Object));
        });
    });

    describe('deleteRole', () => {
        it('should successfully delete a role with no children or assigned users', async () => {
            const roleId = new Types.ObjectId().toHexString();
            (MRole.countDocuments as jest.Mock).mockResolvedValue(0);
            (MUser.countDocuments as jest.Mock).mockResolvedValue(0);
            (MRole.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: roleId });

            await expect(roleService.deleteRole(roleId)).resolves.toBeDefined();
        });

        it('should throw an error if the role has child roles', async () => {
            (MRole.countDocuments as jest.Mock).mockResolvedValue(1);
            await expect(roleService.deleteRole('roleId')).rejects.toThrow('Cannot delete a role that has child roles.');
        });

        it('should throw an error if the role is assigned to users', async () => {
            (MRole.countDocuments as jest.Mock).mockResolvedValue(0);
            (MUser.countDocuments as jest.Mock).mockResolvedValue(1);
            await expect(roleService.deleteRole('roleId')).rejects.toThrow('Cannot delete a role that is currently assigned to users.');
        });
        
        it('should throw an error if the role to delete is not found', async () => {
            (MRole.countDocuments as jest.Mock).mockResolvedValue(0);
            (MUser.countDocuments as jest.Mock).mockResolvedValue(0);
            (MRole.findByIdAndDelete as jest.Mock).mockResolvedValue(null);
            await expect(roleService.deleteRole('roleId')).rejects.toThrow('Role not found.');
        });
    });

    describe('getDescendantRoleIds', () => {
        it('should recursively find all descendant role IDs', async () => {
            const rootId = new Types.ObjectId();
            const childId = new Types.ObjectId();
            const grandchildId = new Types.ObjectId();

            (MRole.find as jest.Mock)
                .mockResolvedValueOnce([{ _id: childId }])
                .mockResolvedValueOnce([{ _id: grandchildId }])
                .mockResolvedValueOnce([]);

            const result = await roleService.getDescendantRoleIds([rootId]);

            expect(result).toBeInstanceOf(Set);
            expect(result.has(childId.toHexString())).toBe(true);
            expect(result.has(grandchildId.toHexString())).toBe(true);
            expect(MRole.find).toHaveBeenCalledTimes(3);
        });
    });

    describe('updateRoleParent', () => {
        it('should prevent a role from being its own parent', async () => {
            const roleId = new Types.ObjectId().toHexString();
            (MRole.findById as jest.Mock).mockResolvedValue({ _id: roleId, save: jest.fn() });
            
            await expect(roleService.updateRoleParent(roleId, roleId)).rejects.toThrow('A role cannot be its own parent.');
        });
        
        it('should prevent moving a role into one of its own children (circular dependency)', async () => {
            const parentId = new Types.ObjectId();
            const childId = new Types.ObjectId();
            
            (MRole.findById as jest.Mock).mockImplementation((id: any) => Promise.resolve({
                _id: id,
                save: jest.fn()
            }));

            (MRole.find as jest.Mock)
                .mockResolvedValueOnce([{ _id: childId }])
                .mockResolvedValueOnce([]);

            await expect(roleService.updateRoleParent(parentId.toHexString(), childId.toHexString()))
                .rejects.toThrow('Cannot move a role into one of its own children.');
        });
        
        it('should throw an error if the role to move is not found', async () => {
            (MRole.findById as jest.Mock).mockResolvedValue(null);
            await expect(roleService.updateRoleParent('nonExistentId', 'newParentId')).rejects.toThrow('Role to move not found.');
        });

        it('should throw an error if the new parent role is not found', async () => {
            (MRole.findById as jest.Mock)
                .mockResolvedValueOnce({ _id: 'roleToMove', save: jest.fn() })
                .mockResolvedValueOnce(null);
                
            await expect(roleService.updateRoleParent('roleToMove', 'nonExistentParent')).rejects.toThrow('New parent role not found.');
        });

        it('should successfully update the parent of a role', async () => {
            const roleId = new Types.ObjectId().toHexString();
            const newParentId = new Types.ObjectId().toHexString();
            const mockRole = { _id: roleId, parent: null, save: jest.fn().mockResolvedValue(true) };

            (MRole.findById as jest.Mock)
                .mockResolvedValueOnce(mockRole)
                .mockResolvedValueOnce({ _id: newParentId });

            (MRole.find as jest.Mock).mockResolvedValue([]);

            await roleService.updateRoleParent(roleId, newParentId);

            expect(mockRole.save).toHaveBeenCalled();
            expect(mockRole.parent).toEqual(new Types.ObjectId(newParentId));
        });
    });
});

