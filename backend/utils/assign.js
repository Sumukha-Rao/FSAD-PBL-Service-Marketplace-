import User from "../models/User.js";
import Booking from "../models/Booking.js";

export async function findCandidates({ serviceId, date, slot, pincode, exclude = [] }) {
  const pros = await User.find({
    role: "professional", approvalStatus: "approved", "services.service": serviceId,
    pincodes: pincode, workingDays: new Date(date).getUTCDay(), _id: { $nin: exclude }
  });
  const busy = await Booking.find({ date, slot, active: true }).distinct("professional");
  const busyIds = new Set(busy.map(String));
  const loads = await Booking.aggregate([
    { $match: { date, active: true } },
    { $group: { _id: "$professional", count: { $sum: 1 } } }
  ]);
  const load = new Map(loads.map((item) => [String(item._id), item.count]));
  return pros.filter((p) => !busyIds.has(String(p._id))).sort((a, b) =>
    (load.get(String(a._id)) ?? 0) - (load.get(String(b._id)) ?? 0) || String(a._id).localeCompare(String(b._id)));
}
export function priceOf(pro, serviceId) {
  return pro.services.find((s) => String(s.service) === String(serviceId))?.price;
}
