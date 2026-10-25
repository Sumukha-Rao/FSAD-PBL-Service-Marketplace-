import mongoose from "mongoose";
import Service, { CATEGORIES } from "../models/Service.js";
import User from "../models/User.js";

export async function listServices(req, res) {
  const filter = { isActive: true };
  if (req.query.category) {
    if (!CATEGORIES.includes(req.query.category)) return res.status(400).json({ message: "Invalid category" });
    filter.category = req.query.category;
  }
  res.json(await Service.find(filter).sort({ name: 1 }));
}

export async function adminServices(req, res) {
  res.json(await Service.find().sort({ name: 1 }));
}

export async function getService(req, res) {
  const service = await Service.findOne({ _id: req.params.id, isActive: true });
  if (!service) return res.status(404).json({ message: "Service not found" });
  res.json(service);
}

// Explicit fields prevent clients from writing arbitrary model properties.
function serviceFields(body = {}) {
  return Object.fromEntries(["name", "category", "description", "minPrice", "maxPrice", "isActive"]
    .filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]]));
}
function validService(s) {
  return typeof s.name === "string" && s.name.trim() && CATEGORIES.includes(s.category) &&
    typeof s.description === "string" && typeof s.isActive === "boolean" &&
    Number.isFinite(s.minPrice) && s.minPrice >= 1 && Number.isFinite(s.maxPrice) && s.maxPrice >= s.minPrice;
}
export async function createService(req, res) {
  const fields = { description: "", isActive: true, ...serviceFields(req.body) };
  if (!validService(fields)) return res.status(400).json({ message: "Provide a name, category and valid price range (minimum at least 1)" });
  res.status(201).json(await Service.create(fields));
}
export async function updateService(req, res) {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ message: "Service not found" });
  const fields = serviceFields(req.body);
  if (!validService({ ...service.toObject(), ...fields })) return res.status(400).json({ message: "Invalid service fields or price range" });
  Object.assign(service, fields);
  res.json(await service.save());
}
export async function updateProfile(req, res) {
  const { services, pincodes, workingDays } = req.body ?? {};
  if (!Array.isArray(services) || !Array.isArray(pincodes) || !Array.isArray(workingDays) ||
      pincodes.some((pin) => typeof pin !== "string" || !/^[1-9]\d{5}$/.test(pin)) ||
      workingDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      services.some((s) => !s || !mongoose.isObjectIdOrHexString(s.service) || !Number.isFinite(s.price)) ||
      new Set(services.map((s) => String(s.service))).size !== services.length) {
    return res.status(400).json({ message: "Provide unique services with numeric prices, six-digit PIN codes and working days (0–6)" });
  }
  const catalog = await Service.find({ _id: { $in: services.map((s) => s.service) }, isActive: true });
  if (services.some((s) => !catalog.some((item) => String(item._id) === s.service && s.price >= item.minPrice && s.price <= item.maxPrice))) {
    return res.status(400).json({ message: "Each service must be active and its price within the catalog range" });
  }
  const user = await User.findByIdAndUpdate(req.user._id, {
    $set: { services: services.map(({ service, price }) => ({ service, price })), pincodes: [...new Set(pincodes)], workingDays: [...new Set(workingDays)] }
  }, { new: true, runValidators: true });
  res.json(user);
}
