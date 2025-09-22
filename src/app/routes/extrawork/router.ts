import { Router } from "express";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import ExtraWorkService from "../../services/ExtraWorkService";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { EExtraWorkStatus } from "../../db/models/MExtraWork.model";
import { Types } from "mongoose";
import UserService from "../../services/UserService";
import { IUserWithPermissions } from "../../db/models/MUser.model";
import { EUserType } from "../../models/enums/EUserType.enum";

const router = Router();
const extraWorkService = ExtraWorkService;

// All extrawork routes should require a user to be logged in.
router.use(authenticationMiddleware);

// GET /api/extrawork - Get extra work for the currently logged-in user / all depending on permissions
router.get("/", hasPermission([EPermission.EXTRA_WORK_VIEW, EPermission.EXTRA_WORK_VIEW_ALL], false), async (req, res) => {
    try {
        // Get the user's ID from the JWT payload
        const user = req.user as IPayloadUser;

        const userWithPermissions = await UserService.getUser(user.id) as IUserWithPermissions;

        const userPermissions = new Set(userWithPermissions.permissions);

        if (userPermissions.has(EPermission.EXTRA_WORK_VIEW_ALL) || userWithPermissions.type == EUserType.Admin) {
            const workItems = await extraWorkService.getExtraWork();

            res.status(200).json(workItems);
            return;
        }

        const workItems = await extraWorkService.getExtraWorkForUser(user.id);
        res.status(200).json(workItems);
    } catch (error) {
        res.status(500).json({ message: "Error fetching your extra work", error: (error as Error).message });
    }
});


// POST /api/extrawork - Create a new extra work entry
router.post("/", hasPermission(EPermission.EXTRA_WORK_CREATE), async (req, res) => {
    try {
        const { studentId, commissionerId, workType, details, remuneration } = req.body;
        const creator = req.user as IPayloadUser;

        if (!studentId || !commissionerId || !workType || !details || remuneration === undefined) {
            return res.status(400).json({ message: "Missing required fields: studentId, commissionerId, workType, details, remuneration" });
        }

        const newExtraWork = await extraWorkService.createExtraWork(creator.id, studentId, commissionerId, workType, details, remuneration);
        res.status(201).json(newExtraWork);
    } catch (error) {
        res.status(500).json({ message: "Error creating extra work", error: (error as Error).message });
    }
});
// PATCH /api/extrawork/:workId/complete - Mark an extra work item as complete
router.patch("/:workId/complete", hasPermission(EPermission.EXTRA_WORK_EDIT), async (req, res) => {
    try {
        const { workId } = req.params;
        const { dateCompleted } = req.body;

        if (!dateCompleted) {
            return res.status(400).json({ message: "The 'dateCompleted' field is required." });
        }

        if (!Types.ObjectId.isValid(workId)) {
            return res.status(400).json({ message: "Invalid work ID format." });
        }

        const date = new Date(dateCompleted);
        if (isNaN(date.getTime())) {
            return res.status(400).json({ message: "Invalid date format for 'dateCompleted'." });
        }

        const updatedWork = await extraWorkService.completeExtraWork(workId, date);
        if (!updatedWork) {
            return res.status(404).json({ message: "Extra work entry not found." });
        }
        res.status(200).json(updatedWork);
    } catch (error) {
        res.status(500).json({ message: "Error completing extra work", error: (error as Error).message });
    }
});

// PATCH /api/extrawork/:workId/status - Update the status of an extra work item
router.patch("/:workId/status", hasPermission(EPermission.EXTRA_WORK_APPROVE), async (req, res) => {
    try {
        const { workId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: "The 'status' field is required." });
        }

        if (!Types.ObjectId.isValid(workId)) {
            return res.status(400).json({ message: "Invalid work ID format." });
        }

        const validStatuses = Object.values(EExtraWorkStatus);
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        }

        const updatedWork = await extraWorkService.setExtraWorkStatus(workId, status);
        if (!updatedWork) {
            return res.status(404).json({ message: "Extra work entry not found." });
        }
        res.status(200).json(updatedWork);
    } catch (error) {
        res.status(500).json({ message: "Error updating extra work status", error: (error as Error).message });
    }
});



export default router;