import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "replace_with_a_long_random_string") {
  throw new Error("Set JWT_SECRET to a private random signing key before starting the server");
}
const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.use("/api", authRoutes);
app.use("/api", serviceRoutes);
app.use("/api", bookingRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err.name === "VersionError") return res.status(409).json({ message: "This record changed. Reload it and try again" });
  const badInput = err.name === "ValidationError" || err.name === "CastError";
  if (badInput) return res.status(400).json({ message: err.message });
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body" });
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request body too large" });
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

await connectDB();
// Wait for the reservation index before accepting concurrent bookings.
await Promise.all([mongoose.model("Booking").init(), mongoose.model("User").init()]);
app.listen(process.env.PORT, () => console.log("Server on port " + process.env.PORT));
