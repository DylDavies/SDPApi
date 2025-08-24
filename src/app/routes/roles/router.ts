import { Router } from "express";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import RoleService from "../../services/RoleService";

const router = Router();
const roleService = RoleService;

// GET /api/roles - Get the entire role tree structure
router.get("/", hasPermission(EPermission.ROLES_VIEW), async (req, res) => {
    try {
        const roleTree = await roleService.getRoleTree();
        res.status(200).json(roleTree);
    } catch (error) {
        res.status(500).json({ message: "Error fetching role tree", error: (error as Error).message });
    }
});

// POST /api/roles - Create a new role
router.post("/", hasPermission(EPermission.ROLES_CREATE), async (req, res) => {
    try {
        const { name, permissions, parent } = req.body;
        if (!name || !permissions) {
            return res.status(400).send("Missing required fields: name, permissions");
        }
        const newRole = await roleService.createRole(name, permissions, parent);
        res.status(201).json(newRole);
    } catch (error) {
        res.status(500).json({ message: "Error creating role", error: (error as Error).message });
    }
});

// DELETE /api/roles/:id - Delete a role
router.delete("/:id", hasPermission(EPermission.ROLES_DELETE), async (req, res) => {
    try {
        const { id } = req.params;
        await roleService.deleteRole(id);
        res.status(200).json({ message: "Role deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: "Error deleting role", error: (error as Error).message });
    }
});

export default router;
