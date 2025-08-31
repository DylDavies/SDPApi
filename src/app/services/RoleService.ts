import { IService } from "../models/interfaces/IService.interface";
import { Singleton } from "../models/classes/Singleton";
import MRole, { IRole } from "../db/models/MRole.model";
import MUser from "../db/models/MUser.model";
import { EPermission } from "../models/enums/EPermission.enum";
import { FlattenMaps, Types } from "mongoose";
import { EServiceLoadPriority } from "../models/enums/EServiceLoadPriority.enum";

// A plain object representing a role from the DB after a .lean() query.
type LeanRole = {
    _id: Types.ObjectId | FlattenMaps<unknown>;
    name: string;
    permissions: EPermission[];
    parent: Types.ObjectId | null;
    color: string;
}

// Define a type for a role node in our tree structure. It's a plain object, not a Mongoose document.
type RoleNode = LeanRole & {
    children: RoleNode[];
};

/**
 * A service for managing the role hierarchy and their permissions.
 * It contains logic to safely interact with the role tree structure.
 */
export class RoleService implements IService {
    public static loadPriority: EServiceLoadPriority = EServiceLoadPriority.Low;

    public async init(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Creates a new role.
     * @param name The name for the new role.
     * @param permissions The permissions to assign to the new role.
     * @param parentId The ID of the parent role. Can be null for a root role.
     * @param color The color of the role.
     * @returns The newly created role document.
     */
    public async createRole(name: string, permissions: EPermission[], parentId: string | null, color: string): Promise<IRole> {
        const parent = parentId ? new Types.ObjectId(parentId) : null;
        const newRole = new MRole({ name, permissions, parent, color });
        await newRole.save();
        return newRole;
    }

    /**
     * Updates an existing role.
     * @param name The name for the new role.
     * @param permissions The permissions to assign to the new role.
     * @param parentId The ID of the parent role. Can be null for a root role.
     * @param color The color of the role.
     * @returns The updated role document.
     */
    public async updateRole(_id: string, name: string, permissions: EPermission[], parentId: string | null, color: string): Promise<IRole> {
        const parent = parentId ? new Types.ObjectId(parentId) : null;
        const res = await MRole.findByIdAndUpdate(_id, {
            name,
            permissions,
            color,
            parent
        });

        return res as IRole;
    }

    /**
     * Retrieves all roles from the database and structures them as a tree.
     * @returns A tree structure of all roles.
     */
    public async getRoleTree(): Promise<RoleNode> {
        const allRoles: LeanRole[] = await MRole.find().lean();
        
        const roleMap = new Map<string, RoleNode>();

        allRoles.forEach(role => {
            roleMap.set(role._id.toString(), { ...role, children: [] });
        });
        
        let root: RoleNode = allRoles.find(v => !v.parent) as RoleNode;

        // Second pass: link children to their parents.
        roleMap.forEach(node => {
            if (node.parent) {
                const parentNode = roleMap.get(node.parent.toString());
                if (parentNode) {
                    parentNode.children.push(node);
                }
            } else {
                // If a node has no parent, it's the root of the tree.
                root = node;
            }
        });
        
        return root;
    }
    
    /**
     * Deletes a role, ensuring it has no children and is not assigned to any users.
     * @param roleId The ID of the role to delete.
     * @returns The deleted role document, or throws an error if deletion is not safe.
     */
    public async deleteRole(roleId: string): Promise<IRole> {
        // TODO: Update to deny deletion of root role

        const childRoles = await MRole.countDocuments({ parent: roleId });
        if (childRoles > 0) {
            throw new Error("Cannot delete a role that has child roles. Please reassign children first.");
        }

        const usersWithRole = await MUser.countDocuments({ roles: roleId });
        if (usersWithRole > 0) {
            throw new Error("Cannot delete a role that is currently assigned to users.");
        }

        const deletedRole = await MRole.findByIdAndDelete(roleId);
        if (!deletedRole) {
            throw new Error("Role not found.");
        }
        return deletedRole;
    }

    /**
     * Recursively finds all descendant role IDs for a given set of parent roles.
     * @param roleIds An array of starting role IDs.
     * @returns A Set containing the IDs of all descendant roles.
     */
    public async getDescendantRoleIds(roleIds: Types.ObjectId[]): Promise<Set<string>> {
        const descendants = new Set<string>();
        const queue: Types.ObjectId[] = [...roleIds];

        while (queue.length > 0) {
            const currentRoleId = queue.shift();
            if (!currentRoleId) continue;

            const children = await MRole.find({ parent: currentRoleId }, '_id');
            for (const child of children) {
                const childIdStr = (child._id as Types.ObjectId).toString();
                if (!descendants.has(childIdStr)) {
                    descendants.add(childIdStr);
                    queue.push(child._id as Types.ObjectId);
                }
            }
        }
        return descendants;
    }

    /**
   * Updates the parent of a given role.
   * Includes validation to prevent circular dependencies (e.g., making a role a child of its own descendant).
   * @param roleId The ID of the role to move.
   * @param newParentId The ID of the new parent role.
   * @returns The updated role document.
   */
    public async updateRoleParent(roleId: string, newParentId: string | null): Promise<IRole> {
        const roleToMove = await MRole.findById(roleId);

        if (!roleToMove) {
            throw new Error("Role to move not found.");
        }

        if (newParentId) {
            if (roleId === newParentId) {
                throw new Error("A role cannot be its own parent.");
            }

            const newParent = await MRole.findById(newParentId);

            if (!newParent) {
                throw new Error("New parent role not found.");
            }

            // CRITICAL: Prevent circular dependencies
            const descendants = await this.getDescendantIds(roleId);

            if (descendants.has(newParentId)) {
                throw new Error("Cannot move a role into one of its own children.");
            }
        }

        roleToMove.parent = newParentId ? new Types.ObjectId(newParentId) : null;
        await roleToMove.save();
        return roleToMove;
    }

    /**
     * Recursively finds all descendant IDs for a given role.
     * @param roleId The starting role ID.
     * @returns A Set containing all descendant role IDs.
     */
    private async getDescendantIds(roleId: string): Promise<Set<string>> {
    const descendants = new Set<string>();
    const children = await MRole.find({ parent: roleId });

    for (const child of children) {
        descendants.add((child._id as Types.ObjectId).toString());
        const grandChildrenIds = await this.getDescendantIds((child._id as Types.ObjectId).toString());
        grandChildrenIds.forEach(id => descendants.add(id));
    }
    return descendants;
    }
}

export default Singleton.getInstance(RoleService);
