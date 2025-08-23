import { Router } from "express";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import UserService from "../../services/UserService";
import MUser from "../../db/models/MUser.model";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";

const router = Router();
const userService = UserService;

// GET /api/users - Get a list of all users
router.get("/", hasPermission(EPermission.USERS_VIEW), async (req, res) => {
    try {
        // Populate roles to show role names in the UI
        const users = await MUser.find().populate('roles', 'name');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: (error as Error).message });
    }
});

// POST /api/users/:userId/roles - Assign a role to a user
router.post("/:userId/roles", hasPermission(EPermission.USERS_MANAGE_ROLES), async (req, res) => {
    try {
        const performingUser = req.user as IPayloadUser;
        const { userId } = req.params;
        const { roleId } = req.body;

        if (!roleId) {
            return res.status(400).send("roleId is required.");
        }

        const updatedUser = await userService.assignRoleToUser(performingUser.id, userId, roleId);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(403).json({ message: "Error assigning role", error: (error as Error).message });
    }
});

// DELETE /api/users/:userId/roles/:roleId - Remove a role from a user
router.delete("/:userId/roles/:roleId", hasPermission(EPermission.USERS_MANAGE_ROLES), async (req, res) => {
    try {
        const performingUser = req.user as IPayloadUser;
        const { userId, roleId } = req.params;

        const updatedUser = await userService.removeRoleFromUser(performingUser.id, userId, roleId);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(403).json({ message: "Error removing role", error: (error as Error).message });
    }
});

export default router;
