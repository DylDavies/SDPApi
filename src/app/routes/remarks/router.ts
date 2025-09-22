import { Router } from "express";
import { authenticationMiddleware } from "../../middleware/auth.middleware";
import RemarkService from "../../services/RemarkService";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import { Singleton } from "../../models/classes/Singleton";
import { LoggingService } from "../../services/LoggingService";

const router = Router();
const remarkService = RemarkService;
router.use(authenticationMiddleware);

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

export default router;