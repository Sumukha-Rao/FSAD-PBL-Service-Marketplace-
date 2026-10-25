import { Router } from "express";
import { protect, allow } from "../middleware/auth.js";
import * as ctrl from "../controllers/authController.js";

const router = Router();

router.post("/auth/register", ctrl.register);
router.post("/auth/register-pro", ctrl.registerPro);
router.post("/auth/login", ctrl.login);
router.post("/auth/logout", ctrl.logout);
router.get("/auth/me", protect, ctrl.me);

router.get("/admin/pros", protect, allow("admin"), ctrl.listPros);
router.patch("/admin/pros/:id", protect, allow("admin"), ctrl.setApproval);

export default router;
