import { Router } from "express";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import { EMissionStatus } from "../../models/enums/EMissions.enum";
import { Types } from "mongoose";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import MissionsService from "../../services/MissionsService";

const router = Router();

router.use(authenticationMiddleware);

router.get("/", hasPermission(EPermission.MISSIONS_VIEW), async (req, res) => {
    try {
        const missions = await MissionsService.getMission();
        res.status(200).json(missions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching missions", error: (error as Error).message });
    }
});

router.get("/student/:studentId", hasPermission(EPermission.MISSIONS_VIEW), async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!Types.ObjectId.isValid(studentId)) {
            return res.status(400).send("Invalid student ID format.");
        }
        const missions = await MissionsService.getMissionsByStudentId(studentId);
        res.status(200).json(missions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching student missions", error: (error as Error).message });
    }
});

router.get("/bundle/:bundleId", hasPermission(EPermission.MISSIONS_VIEW), async (req, res) => {
    try {
        const { bundleId } = req.params;
        if (!Types.ObjectId.isValid(bundleId)) {
            return res.status(400).send("Invalid bundle ID format.");
        }
        res.status(200).json(await MissionsService.getMissionsByBundleId(bundleId));
    } catch (error) {
        res.status(500).json({ message: "Error fetching bundle missions", error: (error as Error).message });
    }
});

// GET /api/missions/find/bundle/:bundleId/tutor/:tutorId - Find a mission by bundle and tutor
router.get("/find/bundle/:bundleId/tutor/:tutorId", async (req, res) => {
    try {
        const { bundleId, tutorId } = req.params;
        const mission = await MissionsService.findMissionByBundleAndTutor(bundleId, tutorId);
        res.status(200).json(mission);
    } catch (error) {
        res.status(500).json({ message: "Error finding mission", error: (error as Error).message });
    }
});

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

router.post("/", hasPermission(EPermission.MISSIONS_CREATE), async (req, res) => {
    try {
        const { documentId, bundleId, studentId, tutorId, remuneration, dateCompleted } = req.body;
        const commissionedBy = req.user as IPayloadUser;

        // --- THIS IS THE FIX ---
        // Changed `!remuneration` to a stricter check for undefined or null.
        if (!documentId || !studentId || !tutorId || remuneration === undefined || remuneration === null || !dateCompleted || !bundleId) {
            return res.status(400).send("Missing required fields");
        }

        const newMission = await MissionsService.createMission({
            documentId,
            bundleId,
            studentId,
            tutorId,
            remuneration: Number(remuneration),
            commissionedById: commissionedBy.id,
            dateCompleted: new Date(dateCompleted)
        });
        res.status(201).json(newMission);
    } catch (error) {
        res.status(500).json({ message: "Error creating mission", error: (error as Error).message });
    }
});

// PATCH /api/missions/:missionId/hours - Update the hours of a mission
router.patch("/:missionId/hours", async (req, res) => {
    try {
        const { missionId } = req.params;
        const { hours } = req.body;

        const updatedMission = await MissionsService.updateMissionHours(missionId, hours);
        if (!updatedMission) {
            return res.status(404).send("Mission not found.");
        }
        res.status(200).json(updatedMission);
    } catch (error) {
        res.status(500).json({ message: "Error updating mission hours", error: (error as Error).message });
    }
});


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
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Error deleting mission", error: (error as Error).message });
    }
});

export default router;