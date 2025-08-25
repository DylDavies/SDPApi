import { Router } from "express";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import UserService from "../../services/UserService";
import MUser from "../../db/models/MUser.model";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { EUserType } from "../../models/enums/EUserType.enum";

const router = Router();
const userService = UserService;

// GET /api/users - Get a list of all users
router.get("/", hasPermission(EPermission.USERS_VIEW), async (req, res) => {
    try {
        // Populate roles to show role names in the UI
        const users = await MUser.find().populate('roles');
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

        const updatedUser = await userService.assignRoleToUser(performingUser.id, userId, roleId, performingUser.type == EUserType.Admin);
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

        const updatedUser = await userService.removeRoleFromUser(performingUser.id, userId, roleId, performingUser.type == EUserType.Admin);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(403).json({ message: "Error removing role", error: (error as Error).message });
    }
});

// POST /api/users/:userId/approve - Approve a user
router.post("/:userId/approve", hasPermission(EPermission.ADMIN_DASHBOARD_VIEW), async (req, res) => {
    try {
        const { userId } = req.params;

        const updatedUser = await userService.approveUser(userId);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(403).json({ message: "Error approving user", error: (error as Error).message });
    }
});

// POST /api/users/:userId/disable - Disable a user
router.post("/:userId/disable", hasPermission(EPermission.ADMIN_DASHBOARD_VIEW), async (req, res) => {
    try {
        const { userId } = req.params;

        const updatedUser = await userService.disableUser(userId);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(403).json({ message: "Error disabling user", error: (error as Error).message });
    }
});

// POST /api/users/:userId/enable - Enable a user
router.post("/:userId/enable", hasPermission(EPermission.ADMIN_DASHBOARD_VIEW), async (req, res) => {
    try {
        const { userId } = req.params;

        const updatedUser = await userService.enableUser(userId);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(403).json({ message: "Error enabling user", error: (error as Error).message });
    }
});

// POST /api/users/:userId/type - Update a User's type
router.post("/:userId/type", hasPermission(EPermission.ADMIN_DASHBOARD_VIEW), async (req, res) => {
    try {
        const { userId } = req.params;
        const { type } = req.body;

        if (!type) {
            return res.status(400).send("type is required.");
        }

        const updatedUser = await userService.updateUserType(userId, type);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(403).json({ message: "Error updating user type", error: (error as Error).message });
    }
});

export default router;
