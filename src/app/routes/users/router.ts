import { Router } from "express";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import UserService from "../../services/UserService";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { EUserType } from "../../models/enums/EUserType.enum";
import { IProficiency } from "../../models/interfaces/IProficiency.interface";

const router = Router();
const userService = UserService;

// GET /api/users - Get a list of all users
router.get("/", hasPermission(EPermission.USERS_VIEW), async (req, res) => {
    try {
        // Populate roles to show role names in the UI
        const users = await userService.getAllUsers();
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
// Add this import to the top of your file
import { ELeave } from "../../models/enums/ELeave.enum";

// POST /api/users/:userId/leave - Submit a new leave request
// This route is for a user to submit their own leave request
// It would not require a userId in the path if the user's ID is taken from the auth token
// but the UserService function takes it as a parameter so we will add it here for consistency
router.post("/:userId/leave", async (req, res) => {
    try {
        const { userId } = req.params;
        const leaveData = req.body;

        const updatedUser = await userService.addLeaveRequest(userId, leaveData);
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: "Error adding leave request", error: (error as Error).message });
    }
});

// PATCH /api/users/:userId/leave/:leaveId - Approve or deny a leave request
// Using PATCH is standard for updating a specific part of a resource
router.patch("/:userId/leave/:leaveId", async (req, res) => {
    try {
        const { userId, leaveId } = req.params;
        const { approved } = req.body;

        if (!approved || (approved !== ELeave.Approved && approved !== ELeave.Denied)) {
            return res.status(400).send("A valid status ('Approved' or 'Denied') is required.");
        }

        const updatedUser = await userService.updateLeaveRequestStatus(userId, leaveId, approved);
        if (!updatedUser) {
            return res.status(404).json({ message: "User or leave request not found." });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: "Error updating leave request status", error: (error as Error).message });
    }
});

// POST /api/users/:userId/proficiencies - Add or update proficiencies for a user
router.post("/:userId/proficiencies", async(req, res) =>{
    try{
        const { userId } = req.params;
        const proficiencyData: IProficiency = req.body;

        if(!proficiencyData || !proficiencyData.name || !proficiencyData.subjects){
            return res.status(400).send("Proficiency data with name and subjects is required.");
        }

        const updatedUser = await userService.addOrUpdateProficiency(userId, proficiencyData);

        if(!updatedUser){
            return res.status(404).send("User not found or update failed.");
        }

        return res.status(200).json(updatedUser);
    } 
    catch (error) {
        res.status(500).json({ message: "Error updating user proficiencies", error: (error as Error).message });
    }
});

// DELETE /api/users/:userId/proficiencies/:profName - Delete a proficiency from a user's profile
router.delete("/:userId/proficiencies/:profName", async (req, res) =>{
    try{
        const { userId, profName } = req.params;
        const updatedUser = await userService.deleteProficiency(userId, profName);
        
        if(!updatedUser){
            return res.status(404).send("User not found or deletion failed.");
        }

        return res.status(200).json(updatedUser);
    } 
    catch (error){
        res.status(500).json({ message: "Error deleting proficiency from user", error: (error as Error).message });
    }
});

// DELETE /api/users/:userId/proficiencies/:profName/subjects/:subjectId - Delete a subject by its ID
router.delete("/:userId/proficiencies/:profName/subjects/:subjectId", async (req, res) =>{
    try{
        const { userId, profName, subjectId } = req.params; 
        const updatedUser = await userService.deleteSubject(userId, profName, subjectId); 
        
        if(!updatedUser){
            return res.status(404).send("User not found or subject deletion failed.");
        }

        return res.status(200).json(updatedUser);
    } 
    catch (error){
        res.status(500).json({ message: "Error deleting subject from user", error: (error as Error).message });
    }
});

// PATCH /api/users/:userId/availability - Update user's availability
router.patch("/:userId/availability", hasPermission(EPermission.PROFILE_PAGE_VIEW), async (req, res) => {
    try {
        const { userId } = req.params;
        const { availability } = req.body;

        if (typeof availability !== 'number' || availability < 0) {
            return res.status(400).json({ message: "A valid non-negative number for availability is required." });
        }

        const updatedUser = await userService.updateAvailability(userId, availability);
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: "Error updating availability", error: (error as Error).message });
    }
});

// POST /api/users/:userId/badges - Add a badge to a user
router.post("/:userId/badges", hasPermission(EPermission.BADGES_MANAGE), async (req, res) =>{
    try{
        const { userId } = req.params;
        const { badgeData } = req.body;

        if(!badgeData){
            return res.status(400).send("badge data is required.");
        }

        const updatedUser = await userService.addBadgeToUser(userId, badgeData);
        res.status(200).json(updatedUser);
    } 
    catch(error){
        res.status(403).json({ message: "Error adding badge", error: (error as Error).message });
    }
});

// DELETE /api/users/:userId/badges/:badgeId - Remove a badge from a user
router.delete("/:userId/badges/:badgeId", hasPermission(EPermission.BADGES_MANAGE), async (req, res) =>{
    try{
        const { userId, badgeId } = req.params;
        
        const updatedUser = await userService.removeBadgeFromUser(userId, badgeId);
        res.status(200).json(updatedUser);
    } 
    catch(error){
        res.status(403).json({ message: "Error removing badge", error: (error as Error).message });
    }
});


export default router;
