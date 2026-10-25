import mongoose from "mongoose";
import Booking, { SLOTS } from "../models/Booking.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { findCandidates, priceOf } from "../utils/assign.js";
import { todayIST, validDate } from "../utils/dates.js";

const details = [
  { path: "service", select: "name category" },
  { path: "professional", select: "name phone" },
  { path: "customer", select: "name phone" }
];
const conflict = (res) => res.status(409).json({ message: "Booking is no longer eligible for this action" });
function eligibleCandidates(candidates, service) {
  // Admin range edits must not result in new bookings outside the current range.
  return candidates.filter((pro) => priceOf(pro, service._id) >= service.minPrice && priceOf(pro, service._id) <= service.maxPrice);
}
export async function createBooking(req, res) {
  const { serviceId, date, slot, address, pincode } = req.body ?? {};
  if (!mongoose.isObjectIdOrHexString(serviceId) || !validDate(date) || date <= todayIST() ||
      !SLOTS.includes(slot) || typeof address !== "string" || !address.trim() ||
      typeof pincode !== "string" || !/^[1-9]\d{5}$/.test(pincode)) {
    return res.status(400).json({ message: "Provide a service, future date (IST), valid slot, address and six-digit PIN code" });
  }
  const service = await Service.findOne({ _id: serviceId, isActive: true });
  if (!service) return res.status(404).json({ message: "Service not found" });
  const candidates = eligibleCandidates(await findCandidates({ serviceId, date, slot, pincode }), service);
  for (const pro of candidates) {
    try {
      const booking = await Booking.create({ customer: req.user._id, professional: pro._id, service: serviceId,
        date, slot, address: address.trim(), pincode, price: priceOf(pro, serviceId) });
      return res.status(201).json(await booking.populate(details));
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
  res.status(409).json({ message: "No professional available for this slot" });
}
export async function myBookings(req, res) {
  res.json(await Booking.find({ customer: req.user._id }).populate(details).sort({ date: -1, slot: 1 }));
}
export async function cancelBooking(req, res) {
  const booking = await Booking.findOneAndUpdate({ _id: req.params.id, customer: req.user._id,
    status: "confirmed", date: { $gt: todayIST() } }, { $set: { status: "cancelled", active: false } }, { new: true });
  if (!booking) return conflict(res);
  res.json(booking);
}
export async function payBooking(req, res) {
  const booking = await Booking.findOneAndUpdate({ _id: req.params.id, customer: req.user._id,
    status: "completed", paymentStatus: "unpaid" }, { $set: { paymentStatus: "paid", paymentMethod: "online" } }, { new: true });
  if (!booking) return conflict(res);
  res.json(booking);
}
export async function reviewBooking(req, res) {
  const { rating, review = "" } = req.body ?? {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof review !== "string") {
    return res.status(400).json({ message: "Rating must be an integer from 1 to 5; review must be text" });
  }
  const booking = await Booking.findOneAndUpdate({ _id: req.params.id, customer: req.user._id,
    status: "completed", rating: { $exists: false } }, { $set: { rating, review: review.trim() } }, { new: true });
  if (!booking) return conflict(res);
  await User.updateOne({ _id: booking.professional }, { $inc: { ratingSum: rating, ratingCount: 1 } });
  res.json(booking);
}
export async function myJobs(req, res) {
  res.json(await Booking.find({ professional: req.user._id }).populate(details).sort({ date: 1, slot: 1 }));
}
export async function updateJobStatus(req, res) {
  const status = req.body?.status;
  if (!["in_progress", "completed"].includes(status)) return res.status(400).json({ message: "Status must be in_progress or completed" });
  const booking = await Booking.findOneAndUpdate({ _id: req.params.id, professional: req.user._id,
    status: status === "in_progress" ? "confirmed" : "in_progress" }, { $set: { status } }, { new: true });
  if (!booking) return conflict(res);
  res.json(booking);
}
export async function declineJob(req, res) {
  const filter = { _id: req.params.id, professional: req.user._id, status: "confirmed", date: { $gt: todayIST() } };
  const booking = await Booking.findOne(filter);
  if (!booking) return conflict(res);
  const declinedBy = [...booking.declinedBy, req.user._id];
  const service = await Service.findOne({ _id: booking.service, isActive: true });
  const candidates = service ? eligibleCandidates(await findCandidates({ serviceId: booking.service,
    date: booking.date, slot: booking.slot, pincode: booking.pincode, exclude: declinedBy }), service) : [];
  for (const pro of candidates) {
    try {
      const updated = await Booking.findOneAndUpdate(filter, { $set: { professional: pro._id,
        price: priceOf(pro, booking.service), declinedBy } }, { new: true });
      if (!updated) return conflict(res);
      return res.json(await updated.populate(details));
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
  const cancelled = await Booking.findOneAndUpdate(filter, { $set: { declinedBy, status: "cancelled", active: false } }, { new: true });
  if (!cancelled) return conflict(res);
  res.json(cancelled);
}
export async function markCashReceived(req, res) {
  const booking = await Booking.findOneAndUpdate({ _id: req.params.id, professional: req.user._id,
    status: "completed", paymentStatus: "unpaid" }, { $set: { paymentStatus: "paid", paymentMethod: "cash" } }, { new: true });
  if (!booking) return conflict(res);
  res.json(booking);
}
export async function allBookings(req, res) {
  res.json(await Booking.find().populate(details).sort({ date: -1, slot: 1 }));
}
