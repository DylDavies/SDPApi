import { Router } from "express";
import MSidebar from "../../db/models/MSidebar.model";
import { hasPermission } from "../../middleware/permission.middleware";
import { EPermission } from "../../models/enums/EPermission.enum";
import { authenticationMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticationMiddleware);

// GET all sidebar items
router.get("/", async (req, res) => {
    const items = await MSidebar.find().sort({ order: 1 });
    res.json(items);
});

// Update sidebar items
router.put("/", hasPermission(EPermission.SIDEBAR_MANAGE), async (req, res) => {
    const items = req.body;
    await MSidebar.deleteMany({});
    await MSidebar.insertMany(items);
    res.json(items);
});

export default router;