import mongoose from "mongoose";
import { validDate } from "../utils/dates.js";

export const SLOTS = ["09-11", "11-13", "14-16", "16-18"];

const { ObjectId } = mongoose.Schema.Types;

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: ObjectId, ref: "User", required: true },
    professional: { type: ObjectId, ref: "User", required: true },
    service: { type: ObjectId, ref: "Service", required: true },
    date: { type: String, required: true, validate: validDate }, // "2026-11-15"
    slot: { type: String, enum: SLOTS, required: true },
    address: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    price: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["confirmed", "in_progress", "completed", "cancelled"],
      default: "confirmed"
    },
    active: { type: Boolean, default: true },
    declinedBy: [{ type: ObjectId, ref: "User" }],
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    paymentMethod: { type: String, enum: ["cash", "online"] },
    rating: { type: Number, min: 1, max: 5, validate: Number.isInteger },
    review: { type: String, trim: true }
  },
  { timestamps: true }
);

// One active booking per professional per date and slot (prevents double booking).
bookingSchema.index(
  { professional: 1, date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

export default mongoose.model("Booking", bookingSchema);
