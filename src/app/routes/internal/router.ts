import { Router } from "express";
import UserService from "../../services/UserService";
import BundleService from "../../services/BundleService";
import PayslipService from "../../services/PayslipService";
import { allowLocalOnly } from "../../middleware/allowLocalOnly.middleware";

const router = Router();

router.use(allowLocalOnly);

router.get("users/ids", async (req, res) => {
    try {
        const ids = await UserService.getIDs();
        res.status(200).json(ids);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user IDs", error: (error as Error).message });
    }
});

router.get("student/ids", async (req, res) => {
    try {
        const ids = await BundleService.getIDs();
        res.status(200).json(ids);
    } catch (error) {
        res.status(500).json({ message: "Error fetching student IDs", error: (error as Error).message });
    }
});

router.get("payslip/ids", async (req, res) => {
    try {
        const ids = await PayslipService.getIDs();
        res.status(200).json(ids);
    } catch (error) {
        res.status(500).json({ message: "Error fetching payslip IDs", error: (error as Error).message });
    }
});

export default router;
