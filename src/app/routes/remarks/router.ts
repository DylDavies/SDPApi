import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import RemarkService from "../../services/RemarkService";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";

const router = Router();
const remarkService = RemarkService;
router.use(authenticationMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/remarks/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/mp3'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, images (JPEG, PNG, GIF, WebP), and audio files (MP3, WAV, OGG) are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

router.get("/templates/active", async (req, res) => {
    try {
        const template = await remarkService.getActiveTemplate();
        res.status(200).json(template);
    } catch (error) {
        res.status(500).json({ message: "Error fetching active remark template", error: (error as Error).message });
    }
});

router.post("/templates", hasPermission(EPermission.REMARKS_MANAGE), async (req, res) => {
    try {
        const { fields } = req.body;
        if (!fields) {
            return res.status(400).json({ message: "Fields are required to update a template." });
        }
        const newTemplate = await remarkService.updateTemplate(fields);
        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(400).json({ message: "Error creating new remark template version", error: (error as Error).message });
    }
});

router.post("/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;
        const { entries } = req.body;
        const newRemark = await remarkService.createRemark(eventId, entries);
        res.status(201).json(newRemark);
    } catch (error) {
        res.status(400).json({ message: "Error creating remark", error: (error as Error).message });
    }
});

router.get("/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;
        const remark = await remarkService.getRemarkForEvent(eventId);
        res.status(200).json(remark);
    } catch (error) {
        res.status(500).json({ message: "Error fetching remark", error: (error as Error).message });
    }
});

router.patch("/:remarkId", async (req, res) => {
    try {
        const { remarkId } = req.params;
        const { entries } = req.body;
        const updatedRemark = await remarkService.updateRemark(remarkId, entries);

        if (!updatedRemark) {
            return res.status(404).json({ message: "Remark not found" });
        }

        res.status(200).json(updatedRemark);
    } catch (error) {
        res.status(400).json({ message: "Error updating remark", error: (error as Error).message });
    }
});

router.get("/student/:studentId", async (req, res) => {
    try {
        const { studentId } = req.params;
        const remarks = await remarkService.getRemarksForStudent(studentId);
        res.status(200).json(remarks);
    } catch (error) {
        res.status(500).json({ message: "Error fetching remarks for student", error: (error as Error).message });
    }
});

// File upload endpoint
router.post("/upload/file", upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const fileData = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            uploadedAt: new Date(),
            url: `/uploads/remarks/${req.file.filename}`
        };

        res.status(200).json(fileData);
    } catch (error) {
        res.status(500).json({ message: "Error uploading file", error: (error as Error).message });
    }
});

export default router;