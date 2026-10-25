import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { e, field, select, alert, money, slots, todayIST, Access, useRemote } from "../components/ui.js";
export default function BookService() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { data: service, error, loading } = useRemote("/api/services/" + serviceId);
  const [form, setForm] = useState({ date: "", slot: slots[0], address: "", pincode: "" });
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (name) => (ev) => setForm({ ...form, [name]: ev.target.value });
  const tomorrow = new Date(todayIST() + "T00:00:00Z"); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  async function submit(ev) {
    ev.preventDefault(); setBusy(true); setFailure("");
    try { await api("/api/bookings", { method: "POST", body: { ...form, serviceId } }); navigate("/bookings"); }
    catch (err) { setFailure(err.message); } finally { setBusy(false); }
  }
  return e(Access, { role: "customer" }, e("h2", null, "Book a service"), alert(error || failure),
    loading ? e("p", null, "Loading…") : !error && e("form", { onSubmit: submit, className: "col-md-6" },
      e("h3", { className: "h5" }, service.name), e("p", null, service.description),
      e("p", null, "An available professional is assigned automatically. Their price will be within " + money(service.minPrice) + " – " + money(service.maxPrice) + "."),
      field("Date (IST)", { type: "date", min: tomorrow.toISOString().slice(0, 10), value: form.date, required: true, onChange: change("date") }),
      select("Time slot (IST)", { value: form.slot, onChange: change("slot") }, slots.map((s) => [s, s + " hours"])),
      field("Full address", { value: form.address, required: true, onChange: change("address") }),
      field("PIN code", { value: form.pincode, pattern: "[1-9][0-9]{5}", inputMode: "numeric", maxLength: 6, required: true, onChange: change("pincode") }),
      e("button", { className: "btn btn-primary", disabled: busy }, busy ? "Assigning…" : "Confirm booking")));
}
