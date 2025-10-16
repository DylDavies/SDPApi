import { Router } from "express";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import FileService from "../../services/FileService";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";

const router = Router();
const fileService = FileService;

// All document routes require a user to be logged in.
router.use(authenticationMiddleware);

/**
 * @route   POST /api/documents/upload-url
 * @desc    Request a pre-signed URL to upload a file to R2.
 * @access  Private
 * @body    { "filename": "my-document.pdf", "contentType": "application/pdf" }
 */
router.post("/upload-url", async (req, res) => {
    try {
        const { filename, contentType } = req.body;
        if (!filename || !contentType) {
            return res.status(400).json({ message: "Filename and contentType are required." });
        }

        const allowedFileTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/ogg'
        ];
        if (!allowedFileTypes.includes(contentType)) {
            return res.status(400).json({ message: "Invalid file type." });
        }

        const { url, fileKey } = await fileService.getPresignedUploadUrl(filename, contentType);

        res.status(200).json({ url, fileKey });
    } catch (error) {
        res.status(500).json({ message: "Error generating upload URL", error: (error as Error).message });
    }
});

/**
 * @route   POST /api/documents/upload-complete
 * @desc    Confirm a file upload is complete and create a record in the database.
 * @access  Private
 * @body    { "fileKey": "...", "originalFilename": "...", "contentType": "..." }
 */
router.post("/upload-complete", async (req, res) => {
    try {
        const user = req.user as IPayloadUser;
        const { fileKey, originalFilename, contentType } = req.body;

        if (!fileKey || !originalFilename || !contentType) {
            return res.status(400).json({ message: "fileKey, originalFilename, and contentType are required." });
        }

        const newDocument = await fileService.createDocumentRecord(fileKey, originalFilename, contentType, user.id);
        // Convert to plain object to ensure _id is serialized as string
        res.status(201).json(newDocument.toObject());
    } catch (error) {
        res.status(500).json({ message: "Error finalizing upload", error: (error as Error).message });
    }
});

/**
 * @route   GET /api/documents/:id/download-url
 * @desc    Request a pre-signed URL to download a file from R2.
 * @access  Private
 */
router.get("/:id/download-url", async (req, res) => {
    try {
        // You could add permission checks here to ensure the user has access to this file
        const { id } = req.params;
        const downloadUrl = await fileService.getPresignedDownloadUrl(id);
        res.status(200).json({ url: downloadUrl });
    } catch (error) {
        if ((error as Error).message === "Document not found.") {
            return res.status(404).json({ message: "Document not found." });
        }
        res.status(500).json({ message: "Error generating download URL", error: (error as Error).message });
    }
});

/**
 * @route   GET /api/documents
 * @desc    Get a list of all uploaded document records.
 * @access  Private
 */
router.get("/", async (req, res) => {
    try {
        const documents = await fileService.getDocuments();
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ message: "Error fetching documents", error: (error as Error).message });
    }
});

export default router;