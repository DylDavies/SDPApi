import { Router } from "express";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import BundleService from "../../services/BundleService";
import IPayloadUser from "../../models/interfaces/IPayloadUser.interface";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import { EBundleStatus } from "../../models/enums/EBundleStatus.enum";

const router = Router();
const bundleService = BundleService;

// All bundle routes should require a user to be logged in.
router.use(authenticationMiddleware);

// POST /api/bundle - Create a new bundle
router.post("/", /*hasPermission(EPermission.BUNDLES_CREATE),*/ async (req, res) => {
    try {
        const { student, subjects } = req.body;
        const creator = req.user as IPayloadUser; // Get the logged-in user from the request

        if (!student || !subjects || !Array.isArray(subjects)) {
            return res.status(400).send("Missing required fields: student, subjects");
        }

        const newBundle = await bundleService.createBundle(student, subjects, creator.id);
        res.status(201).json(newBundle);
    } catch (error) {
        res.status(500).json({ message: "Error creating bundle", error: (error as Error).message });
    }
});

// POST /api/bundle/:bundleId/subjects - Add a subject to a bundle
router.post("/:bundleId/subjects", /*hasPermission(EPermission.BUNDLES_EDIT),*/ async (req, res) => {
    try {
        const { bundleId } = req.params;
        const subject = req.body;

        if (!subject || !subject.subject || !subject.tutor || subject.hours === undefined) {
            return res.status(400).send("Missing required fields for subject: subject, tutor, hours");
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

// DELETE /api/bundle/:bundleId/subjects/:subjectId - Remove a subject from a bundle
router.delete("/:bundleId/subjects/:subjectId", /*hasPermission(EPermission.BUNDLES_EDIT),*/ async (req, res) => {
    try {
        const { bundleId, subjectId } = req.params;
        const updatedBundle = await bundleService.removeSubjectFromBundle(bundleId, subjectId);

        if (!updatedBundle) {
            return res.status(404).send("Bundle not found.");
        }
        res.status(200).json(updatedBundle);
    } catch (error) {
        res.status(500).json({ message: "Error removing subject from bundle", error: (error as Error).message });
    }
});

// PATCH /api/bundle/:bundleId/status/active - Mark a bundle as active or inactive
router.patch("/:bundleId/status/active", /*hasPermission(EPermission.BUNDLES_EDIT),*/ async (req, res) => {
    try {
        const { bundleId } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).send("Field 'isActive' must be a boolean.");
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

// PATCH /api/bundle/:bundleId/status - Update the status of a bundle (pending, approved, disapproved)
router.patch("/:bundleId/status", /*hasPermission(EPermission.BUNDLES_EDIT),*/ async (req, res) => {
    try {
        const { bundleId } = req.params;
        const { status } = req.body;

        if (!status || !Object.values(EBundleStatus).includes(status)) {
            return res.status(400).send(`Invalid status. Must be one of: ${Object.values(EBundleStatus).join(", ")}`);
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