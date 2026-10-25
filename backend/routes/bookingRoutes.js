import { Router } from "express";
import { protect, allow } from "../middleware/auth.js";
import * as ctrl from "../controllers/bookingController.js";

const router = Router();

router.use("/jobs", protect, allow("professional"), (req, res, next) => {
  if (req.user.approvalStatus !== "approved") return res.status(403).json({ message: "Professional approval required" });
  next();
});

router.post("/bookings", protect, allow("customer"), ctrl.createBooking);
router.get("/bookings/mine", protect, allow("customer"), ctrl.myBookings);
router.patch("/bookings/:id/cancel", protect, allow("customer"), ctrl.cancelBooking);
router.patch("/bookings/:id/pay", protect, allow("customer"), ctrl.payBooking);
router.patch("/bookings/:id/review", protect, allow("customer"), ctrl.reviewBooking);

router.get("/jobs", ctrl.myJobs);
router.patch("/jobs/:id/status", ctrl.updateJobStatus);
router.patch("/jobs/:id/decline", ctrl.declineJob);
router.patch("/jobs/:id/cash", ctrl.markCashReceived);

router.get("/admin/bookings", protect, allow("admin"), ctrl.allBookings);

export default router;
