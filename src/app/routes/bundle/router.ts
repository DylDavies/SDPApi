import { Router } from "express";
import BundleService from "../../services/BundleService";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import { EBundleStatus } from "../../models/enums/EBundleStatus.enum";
import { Types } from "mongoose";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";

const router = Router();
const bundleService = BundleService;

// All bundle routes should require a user to be logged in.
router.use(authenticationMiddleware);

// GET /api/bundle - Get all bundles
router.get("/", hasPermission(EPermission.BUNDLES_VIEW), async (req, res) => {
    try {
        const bundles = await bundleService.getBundles();
        res.status(200).json(bundles);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bundles", error: (error as Error).message });
    }
});
// GET /api/bundle/:bundleId - Get a single bundle by its ID
router.get("/:bundleId", hasPermission(EPermission.BUNDLES_VIEW), async (req, res) => {
    try {
        const { bundleId } = req.params;

        if (!Types.ObjectId.isValid(bundleId)) {
            return res.status(400).send("Invalid bundle ID format.");
        }

        const bundle = await bundleService.getBundleById(bundleId); // Assumes you will create this service method

        if (!bundle) {
            return res.status(404).send("Bundle not found.");
        }

        res.status(200).json(bundle);
    } catch (error) {
        res.status(500).json({ message: "Error fetching bundle", error: (error as Error).message });
    }
});

// POST /api/bundle - Create a new bundle
router.post("/", hasPermission(EPermission.BUNDLES_CREATE), async (req, res) => {
    try {
        const { student, subjects } = req.body;
        const creator = req.user as IPayloadUser;

        if (!student || !subjects || !Array.isArray(subjects)) {
            return res.status(400).send("Missing required fields: student, subjects");
        }
        
        if (!Types.ObjectId.isValid(student)) {
            return res.status(400).send("Invalid student ID format.");
        }

        const newBundle = await bundleService.createBundle(student, subjects, creator.id);
        res.status(201).json(newBundle);
    } catch (error) {
        res.status(500).json({ message: "Error creating bundle", error: (error as Error).message });
    }
});

// PATCH /api/bundle/:bundleId - Update a bundle
router.patch("/:bundleId", hasPermission(EPermission.BUNDLES_EDIT), async (req, res) => {
    try {
        const { bundleId } = req.params;
        const updateData = req.body;

        if (!Types.ObjectId.isValid(bundleId)) {
            return res.status(400).send("Invalid bundle ID format.");
        }
        const updatedBundle = await bundleService.updateBundle(bundleId, updateData);
        if (!updatedBundle) {
            return res.status(404).send("Bundle not found.");
        }
        res.status(200).json(updatedBundle);
    } catch (error) {
        res.status(500).json({ message: "Error updating bundle", error: (error as Error).message });
    }
});

// POST /api/bundle/:bundleId/subjects - Add a subject to a bundle
router.post("/:bundleId/subjects", hasPermission(EPermission.BUNDLES_EDIT), async (req, res) => {
    try {
        const { bundleId } = req.params;
        const subject = req.body;

        if (!subject || !subject.subject || !subject.tutor || subject.hours === undefined) {
            return res.status(400).send("Missing required fields for subject: subject, tutor, hours");
        }
        if (!Types.ObjectId.isValid(bundleId)) {
            return res.status(400).send("Invalid bundle ID format.");
        }
        if (!Types.ObjectId.isValid(subject.tutor)) {
            return res.status(400).send("Invalid tutor ID format.");
        }
        if (typeof subject.hours !== 'number' || subject.hours <= 0) {
            return res.status(400).send("Hours must be a positive number.");
        }

        const updatedBundle = await bundleService.addSubjectToBundle(bundleId, subject);
        if (!updatedBundle) {
            return res.status(404).send("Bundle not found.");
        }
        res.status(200).json(updatedBundle);
    } catch (error) {
        res.status(500).json({ message: "Error adding subject to bundle", error: (error as Error).message });
    }
});

// DELETE /api/bundle/:bundleId/subjects/:subjectName - Remove a subject from a bundle
router.delete("/:bundleId/subjects/:subjectName", hasPermission(EPermission.BUNDLES_EDIT), async (req, res) => {
    try {
        const { bundleId, subjectName } = req.params;
        
        if (!Types.ObjectId.isValid(bundleId)) {
            return res.status(400).send("Invalid bundle ID format provided.");
        }

        const updatedBundle = await bundleService.removeSubjectFromBundle(bundleId, subjectName);
        
        if (!updatedBundle) {
            return res.status(404).send("Bundle not found.");
        }
        res.status(200).json(updatedBundle);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(404).json({ message: "Error removing subject", error: error.message });
        }
        res.status(500).json({ message: "An unexpected error occurred." });
    }
});


// PATCH /api/bundle/:bundleId/status/active - Mark a bundle as active or inactive
router.patch("/:bundleId/status/active", hasPermission(EPermission.BUNDLES_DELETE), async (req, res) => {
    try {
        const { bundleId } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).send("Field 'isActive' must be a boolean.");
        }
        if (!Types.ObjectId.isValid(bundleId)) {
            return res.status(400).send("Invalid bundle ID format.");
        }

        const updatedBundle = await bundleService.setBundleActiveStatus(bundleId, isActive);
        if (!updatedBundle) {
            return res.status(404).send("Bundle not found.");
        }
        res.status(200).json(updatedBundle);
    } catch (error) {
        res.status(500).json({ message: "Error updating bundle active status", error: (error as Error).message });
    }
});

// PATCH /api/bundle/:bundleId/status - Update the status of a bundle (e.g., 'pending', 'approved')
router.patch("/:bundleId/status", hasPermission(EPermission.BUNDLES_APPROVE), async (req, res) => {
    try {
        const { bundleId } = req.params;
        const { status } = req.body;

        if (status === undefined || status === null) {
             return res.status(400).send("Field 'status' is required.");
        }
        if (!Types.ObjectId.isValid(bundleId)) {
            return res.status(400).send("Invalid bundle ID format.");
        }

        const validStatuses = Object.values(EBundleStatus);

        if (!validStatuses.includes(status)) {
            return res.status(400).send(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }

        const updatedBundle = await bundleService.setBundleStatus(bundleId, status);
        if (!updatedBundle) {
            return res.status(404).send("Bundle not found.");
        }
        res.status(200).json(updatedBundle);
    } catch (error) {
        res.status(500).json({ message: "Error updating bundle status", error: (error as Error).message });
    }
});

export default router;