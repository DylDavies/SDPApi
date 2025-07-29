import { Router } from "express";
import { AuthService } from "../../services/AuthService";

const router = Router();

router.get("/", (req, res) => {
    let user = AuthService.getInstance().getUser();

    res.send(user.name);
});

export default router;