import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.js";
import { e, field, alert, money, Access, useRemote } from "../components/ui.js";
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export default function ProProfile() {
  const { user, setUser } = useAuth();
  const { data, error, loading } = useRemote(user?.role === "professional" ? "/api/services" : null);
  const [prices, setPrices] = useState({});
  const [pins, setPins] = useState("");
  const [workingDays, setWorkingDays] = useState([]);
  const [failure, setFailure] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPrices(Object.fromEntries((user?.services || []).map((s) => [s.service, s.price])));
    setPins((user?.pincodes || []).join(", ")); setWorkingDays(user?.workingDays || []);
  }, [user]);
  async function submit(ev) {
    ev.preventDefault(); setBusy(true); setFailure(""); setMessage("");
    try {
      const services = data.filter((s) => Object.hasOwn(prices, s._id)).map((s) => ({ service: s._id, price: Number(prices[s._id]) }));
      setUser(await api("/api/pro/profile", { method: "PUT", body: { services, pincodes: pins.split(/[,\s]+/).filter(Boolean), workingDays } }));
      setMessage("Profile saved.");
    } catch (err) { setFailure(err.message); } finally { setBusy(false); }
  }
  return e(Access, { role: "professional" }, e("h2", null, "My professional profile"),
    e("p", null, "Approval: " + (user?.approvalStatus || "pending")), alert(error || failure), alert(message, "success"),
    loading ? e("p", null, "Loading…") : e("form", { onSubmit: submit },
      e("fieldset", { className: "mb-3" }, e("legend", { className: "h5" }, "Services and your prices"),
        !data.length && e("p", null, "No active services available."), data.map((s) => e("div", { key: s._id, className: "card p-3 mb-2" },
          e("label", null, e("input", { type: "checkbox", className: "form-check-input me-2", checked: Object.hasOwn(prices, s._id), onChange: (ev) => {
            const next = { ...prices }; if (ev.target.checked) next[s._id] = s.minPrice; else delete next[s._id]; setPrices(next);
          } }), s.name + " (" + money(s.minPrice) + " – " + money(s.maxPrice) + ")"),
          Object.hasOwn(prices, s._id) && field("Your price (₹)", { type: "number", min: s.minPrice, max: s.maxPrice, step: "any", required: true,
            value: prices[s._id], onChange: (ev) => setPrices({ ...prices, [s._id]: ev.target.value }) })))),
      field("PIN codes (comma separated)", { value: pins, onChange: (ev) => setPins(ev.target.value), placeholder: "560001, 560002" }),
      e("fieldset", { className: "mb-3" }, e("legend", { className: "h5" }, "Working days"), days.map((day, i) => e("label", { key: day, className: "me-3" },
        e("input", { type: "checkbox", className: "form-check-input me-1", checked: workingDays.includes(i),
          onChange: (ev) => setWorkingDays(ev.target.checked ? [...workingDays, i] : workingDays.filter((d) => d !== i)) }), day))),
      e("button", { className: "btn btn-primary", disabled: busy || Boolean(error) }, busy ? "Saving…" : "Save profile")));
}
