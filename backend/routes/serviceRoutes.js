import { Router } from "express";
import { protect, allow } from "../middleware/auth.js";
import * as ctrl from "../controllers/serviceController.js";

const router = Router();

router.get("/admin/services", protect, allow("admin"), ctrl.adminServices);
router.get("/services", ctrl.listServices);
router.get("/services/:id", ctrl.getService);
router.post("/services", protect, allow("admin"), ctrl.createService);
router.patch("/services/:id", protect, allow("admin"), ctrl.updateService);

router.put("/pro/profile", protect, allow("professional"), ctrl.updateProfile);

export default router;
