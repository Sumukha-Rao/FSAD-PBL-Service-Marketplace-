// Member 1: auth and professional approval (prd.md sections 8 and 9).
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const ONE_DAY = 24 * 60 * 60 * 1000;

// Create a JWT for the user, put it in an HttpOnly cookie and send the user back.
function sendToken(res, user, status = 200) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: ONE_DAY });
  res.status(status).json(user);
}

// Shared by both signups. The role comes from the server, never from req.body.
async function createUser(req, res, extra) {
  const { name, email, password, phone } = req.body ?? {};
  if ([name, email, password, phone].some((value) => typeof value !== "string" || !value.trim()) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Provide name, valid email, phone and a password of at most 72 UTF-8 bytes" });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const hash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await User.create({ name: name.trim(), email: normalizedEmail, phone: phone.trim(), password: hash, ...extra });
  } catch (err) {
    // The unique index also handles two simultaneous signups for the same email.
    if (err.code === 11000) return res.status(409).json({ message: "Email already registered" });
    throw err;
  }
  sendToken(res, user, 201);
}

// POST /api/auth/register  { name, email, password, phone }  -> customer
export async function register(req, res) {
  await createUser(req, res, { role: "customer" });
}

// POST /api/auth/register-pro  { name, email, password, phone, experienceYears }  -> pending professional
export async function registerPro(req, res) {
  const experienceYears = req.body?.experienceYears ?? 0;
  if (!Number.isFinite(experienceYears) || experienceYears < 0) {
    return res.status(400).json({ message: "Experience must be a nonnegative number" });
  }
  await createUser(req, res, {
    role: "professional",
    approvalStatus: "pending",
    experienceYears
  });
}

// POST /api/auth/login  { email, password }  -> set "token" cookie
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Email and password must be valid strings" });
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  sendToken(res, user);
}

// POST /api/auth/logout  -> clear "token" cookie
export async function logout(req, res) {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  res.json({ message: "Logged out" });
}

// GET /api/auth/me  -> current user
export async function me(req, res) {
  res.json(req.user);
}

// GET /api/admin/pros?status=pending
export async function listPros(req, res) {
  const filter = { role: "professional" };
  if (req.query.status) {
    if (!["pending", "approved", "rejected"].includes(req.query.status)) return res.status(400).json({ message: "Invalid approval status" });
    filter.approvalStatus = req.query.status;
  }
  res.json(await User.find(filter));
}

// PATCH /api/admin/pros/:id  { approvalStatus: "approved" | "rejected" }
export async function setApproval(req, res) {
  const status = req.body?.approvalStatus;
  if (status !== "approved" && status !== "rejected") {
    return res.status(400).json({ message: "approvalStatus must be approved or rejected" });
  }
  const pro = await User.findOneAndUpdate(
    { _id: req.params.id, role: "professional" },
    { approvalStatus: status },
    { new: true }
  );
  if (!pro) return res.status(404).json({ message: "Professional not found" });
  res.json(pro);
}
