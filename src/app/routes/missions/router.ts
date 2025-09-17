import { Router } from "express";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import { EMissionStatus } from "../../models/enums/EMissions.enum"; // Import the new Mission Status enum
import { Types } from "mongoose";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import MissionsService, { MissionService } from "../../services/MissionsService";

const router = Router();

// All mission routes require a user to be logged in.
router.use(authenticationMiddleware);

// GET /api/missions - Get all missions
router.get("/", hasPermission(EPermission.MISSIONS_VIEW), async (req, res) => {
    try {
        const missions = await MissionsService.getMission();
        res.status(200).json(missions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching missions", error: (error as Error).message });
    }
});

// GET /api/missions/:missionId - Get a single mission by its ID
router.get("/:missionId", hasPermission(EPermission.MISSIONS_VIEW), async (req, res) => {
    try {
        const { missionId } = req.params;

        if (!Types.ObjectId.isValid(missionId)) {
            return res.status(400).send("Invalid mission ID format.");
        }

        const mission = await MissionsService.getMissionById(missionId);

        if (!mission) {
            return res.status(404).send("Mission not found.");
        }

        res.status(200).json(mission);
    } catch (error) {
        res.status(500).json({ message: "Error fetching mission", error: (error as Error).message });
    }
});

// POST /api/missions - Create a new mission
router.post("/", hasPermission(EPermission.MISSIONS_CREATE), async (req, res) => {
    try {
        const { document, studentId, remuneration, dateCompleted } = req.body;
        const commissionedBy = req.user as IPayloadUser;

        if (!document || !studentId || !remuneration || !dateCompleted) {
            return res.status(400).send("Missing required fields: document, studentId, remuneration, dateCompleted");
        }
        
        if (!Types.ObjectId.isValid(studentId)) {
            return res.status(400).send("Invalid student ID format.");
        }

        const newMission = await MissionsService.createMission({
            document,
            studentId,
            remuneration,
            commissionedById: commissionedBy.id,
            dateCompleted
        });
        res.status(201).json(newMission);
    } catch (error) {
        res.status(500).json({ message: "Error creating mission", error: (error as Error).message });
    }
});

// PATCH /api/missions/:missionId - Update a mission
router.patch("/:missionId", hasPermission(EPermission.MISSIONS_EDIT), async (req, res) => {
    try {
        const { missionId } = req.params;
        const updateData = req.body;

        if (!Types.ObjectId.isValid(missionId)) {
            return res.status(400).send("Invalid mission ID format.");
        }
        const updatedMission = await MissionsService.updateMission(missionId, updateData);
        if (!updatedMission) {
            return res.status(404).send("Mission not found.");
        }
        res.status(200).json(updatedMission);
    } catch (error) {
        res.status(500).json({ message: "Error updating mission", error: (error as Error).message });
    }
});

// PATCH /api/missions/:missionId/status - Update the status of a mission
router.patch("/:missionId/status", hasPermission(EPermission.MISSIONS_APPROVE), async (req, res) => {
    try {
        const { missionId } = req.params;
        const { status } = req.body;

        if (!status) {
             return res.status(400).send("Field 'status' is required.");
        }
        if (!Types.ObjectId.isValid(missionId)) {
            return res.status(400).send("Invalid mission ID format.");
        }

        const validStatuses = Object.values(EMissionStatus);
        if (!validStatuses.includes(status)) {
            return res.status(400).send(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }

        const updatedMission = await MissionsService.setMissionStatus(missionId, status);
        if (!updatedMission) {
            return res.status(404).send("Mission not found.");
        }
        res.status(200).json(updatedMission);
    } catch (error) {
        res.status(500).json({ message: "Error updating mission status", error: (error as Error).message });
    }
});

// DELETE /api/missions/:missionId - Delete a mission
router.delete("/:missionId", hasPermission(EPermission.MISSIONS_DELETE), async (req, res) => {
    try {
        const { missionId } = req.params;
        if (!Types.ObjectId.isValid(missionId)) {
            return res.status(400).send("Invalid mission ID format.");
        }

        const result = await MissionsService.deleteMission(missionId);
        if (result.deletedCount === 0) {
            return res.status(404).send("Mission not found.");
        }
        res.status(204).send(); // 204 No Content for successful deletion
    } catch (error) {
        res.status(500).json({ message: "Error deleting mission", error: (error as Error).message });
    }
});

export default router;