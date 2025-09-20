import { Router } from "express";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import { EMissionStatus } from "../../models/enums/EMissions.enum"; // Import the new Mission Status enum
import { Types } from "mongoose";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import MissionsService from "../../services/MissionsService";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// --- Setup Multer for File Uploads ---
const uploadDir = 'uploads/missions';

// Ensure the upload directory exists
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed!"));
        }
    }
});

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
// GET /api/missions/student/:studentId - Get all missions for a specific student
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
// GET /api/missions/bundle/:bundleId - Get all missions for a specific bundle
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

// POST /api/missions - Create a new mission with a file upload
router.post("/", upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).send("Invalid request body");
        }
        const {bundleId, studentId, tutorId, remuneration, dateCompleted } = req.body;
        const commissionedBy = req.user as IPayloadUser;

        if (!bundleId || !studentId || !tutorId || !remuneration || !dateCompleted) {
            return res.status(400).send("Missing required fields");
        }

        const newMission = await MissionsService.createMission({
            bundleId,
            documentPath: req.file.path,
            documentName: req.file.originalname,
            studentId,
            tutorId,
            remuneration: Number(remuneration), // Convert string to number
            commissionedById: commissionedBy.id,
            dateCompleted: new Date(dateCompleted) // Convert string to Date
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

// GET /api/missions/document/:filename - Download a mission document
router.get("/document/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('File not found.');
        }

        res.sendFile(path.resolve(filePath));
    });
});


export default router;