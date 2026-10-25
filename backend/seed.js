// Creates the admin account and starter services. Safe to run more than once.
import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Service from "./models/Service.js";

const services = [
  { name: "AC General Service", category: "ac", minPrice: 500, maxPrice: 900 },
  { name: "Home Deep Cleaning", category: "cleaning", minPrice: 1500, maxPrice: 3000 },
  { name: "Wall Painting (per room)", category: "painting", minPrice: 2000, maxPrice: 4000 },
  { name: "Tap and Leak Repair", category: "plumbing", minPrice: 200, maxPrice: 500 },
  { name: "Fan and Switch Repair", category: "electrical", minPrice: 200, maxPrice: 500 },
  { name: "Washing Machine Repair", category: "appliance", minPrice: 400, maxPrice: 800 }
];

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password ||
    password === "replace_with_a_private_password" || Buffer.byteLength(password, "utf8") > 72) {
  throw new Error("Set ADMIN_EMAIL and a private ADMIN_PASSWORD (at most 72 UTF-8 bytes) before seeding");
}
try {
  await connectDB();
  await User.init();
  const existing = await User.findOne({ email });
  if (existing && existing.role !== "admin") throw new Error("ADMIN_EMAIL belongs to a non-admin account; choose another email");
  if (!existing) {
    await User.create({ name: "Admin", email, phone: "0000000000", password: await bcrypt.hash(password, 10), role: "admin" });
    console.log("Admin created");
  }
  for (const service of services) {
    await Service.updateOne({ name: service.name }, { $setOnInsert: service }, { upsert: true });
  }
  console.log("Services seeded: " + services.length);
} finally {
  await mongoose.disconnect();
}
