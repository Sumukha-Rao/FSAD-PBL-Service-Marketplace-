import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import { todayIST } from "../utils/dates.js";

let child, base, testUri, admin, customer, other, pro, pro2, pending, service;
const secret = "isolated-integration-test-signing-key";
const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const token = (u) => jwt.sign({ id: u._id }, secret);
async function request(path, user, method = "GET", body) {
  const response = await fetch(base + "/api" + path, { method, headers: { "Content-Type": "application/json", ...(user ? { Cookie: "token=" + token(user) } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
const book = (user = customer, fields = {}) => request("/bookings", user, "POST", { serviceId: String(service._id), date, slot: "09-11", address: "12 Main Road", pincode: "560001", ...fields });
const action = (id, verb, user = customer, body) => request("/bookings/" + id + "/" + verb, user, "PATCH", body);
const job = (id, verb, user = pro, body) => request("/jobs/" + id + "/" + verb, user, "PATCH", body);
async function fixture(role, name, extra = {}) {
  return User.create({ role, name, email: name + "@example.test", phone: "1234567890", password: "unused-test-hash", ...extra });
}
before(async () => {
  const dbName = "homeease_test_" + process.pid + "_" + Date.now();
  const uri = new URL(process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017");
  uri.pathname = "/" + dbName;
  testUri = uri.toString();
  await mongoose.connect(testUri);
  await Promise.all([User.init(), Service.init(), Booking.init()]);
  const portFinder = net.createServer(); portFinder.listen(0, "127.0.0.1"); await once(portFinder, "listening");
  const port = portFinder.address().port; await new Promise((resolve) => portFinder.close(resolve));
  base = "http://127.0.0.1:" + port;
  child = spawn(process.execPath, ["server.js"], { cwd: new URL("../", import.meta.url), env: { ...process.env, MONGO_URI: uri.toString(), PORT: String(port), JWT_SECRET: secret }, stdio: ["ignore", "pipe", "pipe"] });
  let output = ""; child.stdout.on("data", (s) => { output += s; }); child.stderr.on("data", (s) => { output += s; });
  for (let i = 0; i < 100; i++) {
    try { if ((await request("/health")).body.db === "connected") return; } catch {}
    if (child.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API startup timed out: " + output);
});
after(async () => {
  if (child && child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  if (mongoose.connection.readyState) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Service.deleteMany({}), Booking.deleteMany({})]);
  service = await Service.create({ name: "Tap repair", category: "plumbing", minPrice: 200, maxPrice: 500 });
  admin = await fixture("admin", "admin"); customer = await fixture("customer", "customer"); other = await fixture("customer", "other");
  const profile = { approvalStatus: "approved", services: [{ service: service._id, price: 300 }], pincodes: ["560001"], workingDays: [0, 1, 2, 3, 4, 5, 6] };
  pro = await fixture("professional", "pro", profile); pro2 = await fixture("professional", "pro2", { ...profile, services: [{ service: service._id, price: 400 }] });
  pending = await fixture("professional", "pending", { ...profile, approvalStatus: "pending" });
});
test("catalog filters, details, admin CRUD and inactive visibility", async () => {
  assert.equal((await request("/services?category=plumbing")).body.length, 1);
  assert.equal((await request("/services?category=invalid")).status, 400);
  assert.equal((await request("/services", customer, "POST", {})).status, 403);
  assert.equal((await request("/services", admin, "POST", { name: "x", category: "ac", minPrice: 500, maxPrice: 100 })).status, 400);
  const created = await request("/services", admin, "POST", { name: "AC", category: "ac", minPrice: 300, maxPrice: 800 });
  assert.equal(created.status, 201);
  assert.equal((await request("/services/" + created.body._id)).body.name, "AC");
  assert.equal((await request("/services/" + created.body._id, admin, "PATCH", { minPrice: 900 })).status, 400);
  assert.equal((await request("/services/" + created.body._id, admin, "PATCH", { isActive: false })).status, 200);
  assert.equal((await request("/services/" + created.body._id)).status, 404);
  assert.equal((await request("/services")).body.length, 1);
  assert.equal((await request("/admin/services", admin)).body.length, 2);
  assert.equal((await request("/admin/services", customer)).status, 403);
});
test("profile validates service prices, PIN codes, weekdays and preserves role", async () => {
  const profile = { services: [{ service: String(service._id), price: 350 }], pincodes: ["560001"], workingDays: [1, 2] };
  assert.equal((await request("/pro/profile", pending, "PUT", { ...profile, role: "admin", approvalStatus: "approved" })).body.approvalStatus, "pending");
  for (const fields of [{ services: [{ service: String(service._id), price: 999 }] }, { pincodes: ["123"] }, { workingDays: [1.5] }, { services: [...profile.services, ...profile.services] }]) {
    assert.equal((await request("/pro/profile", pro, "PUT", { ...profile, ...fields })).status, 400);
  }
  assert.equal((await request("/pro/profile", customer, "PUT", profile)).status, 403);
});
test("approval and ownership gates protect all job actions", async () => {
  const b = (await book()).body;
  for (const verb of ["status", "decline", "cash"]) assert.equal((await job(b._id, verb, pending, { status: "in_progress" })).status, 403);
  assert.equal((await request("/jobs", pending)).status, 403);
  assert.equal((await request("/jobs", customer)).status, 403);
  assert.equal((await job(b._id, "status", pro2, { status: "in_progress" })).status, 409);
  assert.equal((await action(b._id, "cancel", other)).status, 409);
  assert.equal((await request("/admin/bookings", customer)).status, 403);
});
test("booking validates date, slot, address, PIN code and ignores client price", async () => {
  for (const fields of [{ date: todayIST() }, { date: "2027-02-30" }, { slot: "01-02" }, { address: " " }, { pincode: "12" }, { serviceId: "bad" }]) assert.equal((await book(customer, fields)).status, 400);
  assert.equal((await book(null)).status, 401);
  const b = await book(customer, { price: 1, professional: pro2._id, status: "completed" });
  assert.equal(b.status, 201); assert.equal(b.body.price, 300); assert.equal(b.body.status, "confirmed");
  assert.equal((await request("/bookings/mine", customer)).body[0].professional.name, "pro");
  assert.equal((await request("/bookings/mine", other)).body.length, 0);
  assert.equal((await request("/admin/bookings", admin)).body.length, 1);
});
test("eligibility requires coverage, working day, approval and offered service", async () => {
  assert.equal((await book(customer, { pincode: "560099" })).status, 409);
  await User.updateOne({ _id: pro._id }, { workingDays: [] });
  await User.updateOne({ _id: pro2._id }, { services: [] });
  assert.equal((await book()).status, 409);
});
test("workload ranking assigns the least busy professional", async () => {
  assert.equal((await book()).body.professional._id, String(pro._id));
  assert.equal((await book(customer, { slot: "11-13" })).body.professional._id, String(pro2._id));
});
test("concurrent reservations fall back and never double book", async () => {
  const results = await Promise.all([book(), book(other), book()]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 409]);
  assert.equal(new Set(results.filter((r) => r.status === 201).map((r) => r.body.professional._id)).size, 2);
  assert.equal(await Booking.countDocuments({ active: true }), 2);
});
test("cancelling frees the slot and cannot repeat or cancel on the booking date", async () => {
  await User.updateOne({ _id: pro2._id }, { workingDays: [] });
  const b = (await book()).body;
  assert.equal((await book(other)).status, 409);
  assert.equal((await action(b._id, "cancel")).body.active, false);
  assert.equal((await action(b._id, "cancel")).status, 409);
  const next = (await book(other)).body; assert.equal(next.professional._id, String(pro._id));
  await Booking.updateOne({ _id: next._id }, { date: todayIST() });
  assert.equal((await action(next._id, "cancel", other)).status, 409);
});
test("decline reassigns price and excludes prior professionals, then cancels", async () => {
  const b = (await book()).body;
  const moved = await job(b._id, "decline");
  assert.equal(moved.body.professional._id, String(pro2._id)); assert.equal(moved.body.price, 400);
  assert.equal((await job(b._id, "status", pro, { status: "in_progress" })).status, 409);
  const cancelled = await job(b._id, "decline", pro2);
  assert.equal(cancelled.body.status, "cancelled"); assert.equal(cancelled.body.active, false);
  assert.equal(cancelled.body.declinedBy.length, 2);
});
test("concurrent declines apply once and leave a valid assignment", async () => {
  const b = (await book()).body;
  const results = await Promise.all([job(b._id, "decline"), job(b._id, "decline")]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const saved = await Booking.findById(b._id); assert.equal(String(saved.professional), String(pro2._id)); assert.equal(saved.declinedBy.length, 1);
});
test("job progression, payments and one-time reviews", async () => {
  const b = (await book()).body;
  assert.equal((await action(b._id, "pay")).status, 409);
  assert.equal((await action(b._id, "review", customer, { rating: 5 })).status, 409);
  assert.equal((await job(b._id, "status", pro, { status: "completed" })).status, 409);
  assert.equal((await job(b._id, "status", pro, { status: "in_progress" })).status, 200);
  assert.equal((await job(b._id, "decline")).status, 409);
  assert.equal((await job(b._id, "status", pro, { status: "completed" })).status, 200);
  const payments = await Promise.all([action(b._id, "pay"), job(b._id, "cash")]);
  assert.deepEqual(payments.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await action(b._id, "pay")).status, 409);
  assert.equal((await action(b._id, "review", customer, { rating: 6 })).status, 400);
  const reviews = await Promise.all([action(b._id, "review", customer, { rating: 4, review: "Good" }), action(b._id, "review", customer, { rating: 4 })]);
  assert.deepEqual(reviews.map((r) => r.status).sort(), [200, 409]);
  const rated = await User.findById(pro._id); assert.equal(rated.ratingCount, 1); assert.equal(rated.ratingSum, 4);
});
test("inactive services and changed price ranges cannot receive new bookings", async () => {
  await Service.updateOne({ _id: service._id }, { minPrice: 450 });
  assert.equal((await book()).status, 409);
  await Service.updateOne({ _id: service._id }, { isActive: false });
  assert.equal((await book()).status, 404);
});

test("registration validates types and normalizes email; concurrent duplicates return 409", async () => {
  const body = { name: "New user", email: " New.User@Example.test ", phone: "9999999999", password: "test-password" };
  const results = await Promise.all([request("/auth/register", null, "POST", body), request("/auth/register", null, "POST", body)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const created = results.find((r) => r.status === 201).body;
  assert.equal(created.email, "new.user@example.test"); assert.equal(created.password, undefined); assert.equal(created.role, "customer");
  const login = await request("/auth/login", null, "POST", { email: body.email, password: body.password });
  assert.equal(login.status, 200); assert.equal(login.body.password, undefined);
  assert.equal((await request("/auth/login", null, "POST", { email: body.email, password: "incorrect" })).status, 401);
  for (const fields of [{ name: {} }, { phone: [] }, { email: "bad" }, { password: {} }, { password: "é".repeat(37) }]) {
    assert.equal((await request("/auth/register", null, "POST", { ...body, ...fields })).status, 400);
  }
  assert.equal((await request("/auth/login", null, "POST", { email: {}, password: [] })).status, 400);
});
test("professional signup validates experience and ignores client privileges", async () => {
  const body = { name: "New pro", email: "newpro@example.test", phone: "9999999999", password: "test-password" };
  for (const experienceYears of [-1, {}, "2"]) assert.equal((await request("/auth/register-pro", null, "POST", { ...body, experienceYears })).status, 400);
  const result = await request("/auth/register-pro", null, "POST", { ...body, experienceYears: 2, role: "admin", approvalStatus: "approved" });
  assert.equal(result.status, 201); assert.equal(result.body.role, "professional"); assert.equal(result.body.approvalStatus, "pending");
});
test("logout clears expired cookies and malformed JSON returns a client error", async () => {
  const result = await fetch(base + "/api/auth/logout", { method: "POST", headers: { Cookie: "token=expired" } });
  assert.equal(result.status, 200); assert.match(result.headers.get("set-cookie"), /token=;/);
  assert.equal((await request("/auth/me")).status, 401);
  const invalid = await fetch(base + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"email":' });
  assert.equal(invalid.status, 400); assert.equal((await invalid.json()).message, "Invalid JSON body");
  const large = await fetch(base + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "x".repeat(110000) }) });
  assert.equal(large.status, 413);
});
test("concurrent catalog edits cannot persist an inverted price range", async () => {
  const first = await Service.findById(service._id);
  const second = await Service.findById(service._id);
  first.minPrice = 400; second.maxPrice = 300;
  await first.save();
  await assert.rejects(second.save(), { name: "VersionError" });
  const saved = await Service.findById(service._id);
  assert.ok(saved.minPrice <= saved.maxPrice);
});


test("seeding is repeatable and refuses a non-admin email collision", async () => {
  async function seed(email) {
    const proc = spawn(process.execPath, ["seed.js"], { cwd: new URL("../", import.meta.url),
      env: { ...process.env, MONGO_URI: testUri, ADMIN_EMAIL: email, ADMIN_PASSWORD: "test-seed-password" }, stdio: "ignore" });
    return (await once(proc, "exit"))[0];
  }
  assert.equal(await seed("seed-admin@example.test"), 0);
  const count = await Service.countDocuments();
  assert.equal(await seed(" SEED-ADMIN@example.test "), 0);
  assert.equal(await Service.countDocuments(), count);
  assert.equal(await User.countDocuments({email:"seed-admin@example.test"}), 1);
  assert.equal(await seed(customer.email), 1);
  assert.equal((await User.findById(customer._id)).role, "customer");
});
