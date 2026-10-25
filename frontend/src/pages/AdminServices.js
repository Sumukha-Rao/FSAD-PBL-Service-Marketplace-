import React, { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.js";
import { e, categories, field, select, alert, money, Access, useRemote } from "../components/ui.js";
const empty = { name: "", category: "ac", description: "", minPrice: "", maxPrice: "", isActive: true };
export default function AdminServices() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useRemote(user?.role === "admin" ? "/api/admin/services" : null);
  const [form, setForm] = useState(empty);
  const [id, setId] = useState("");
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (name) => (ev) => setForm({ ...form, [name]: ev.target.value });
  async function submit(ev) {
    ev.preventDefault(); setBusy(true); setFailure(""); setMessage("");
    try {
      await api("/api/services" + (id ? "/" + id : ""), { method: id ? "PATCH" : "POST", body: {
        ...form, minPrice: Number(form.minPrice), maxPrice: Number(form.maxPrice)
      } });
      setMessage("Service saved."); setForm(empty); setId(""); reload();
    } catch (err) { setFailure(err.message); } finally { setBusy(false); }
  }
  return e(Access, { role: "admin" }, e("h2", null, "Manage services"), alert(error || failure), alert(message, "success"),
    e("form", { onSubmit: submit, className: "card p-3 mb-4" }, e("h3", { className: "h5" }, id ? "Edit service" : "New service"),
      field("Name", { value: form.name, required: true, onChange: change("name") }),
      select("Category", { value: form.category, onChange: change("category") }, categories.map((c) => [c, c])),
      field("Description", { value: form.description, onChange: change("description") }),
      field("Minimum price (₹)", { type: "number", min: 1, step: "any", required: true, value: form.minPrice, onChange: change("minPrice") }),
      field("Maximum price (₹)", { type: "number", min: form.minPrice || 1, step: "any", required: true, value: form.maxPrice, onChange: change("maxPrice") }),
      e("label", { className: "mb-3" }, e("input", { type: "checkbox", className: "form-check-input me-2", checked: form.isActive,
        onChange: (ev) => setForm({ ...form, isActive: ev.target.checked }) }), "Active"),
      e("div", null, e("button", { className: "btn btn-primary me-2", disabled: busy }, busy ? "Saving…" : "Save service"),
        id && e("button", { type: "button", className: "btn btn-secondary", onClick: () => { setId(""); setForm(empty); } }, "Cancel edit"))),
    loading ? e("p", null, "Loading…") : e("div", { className: "list-group" }, !data.length && e("p", null, "No services yet."), data.map((s) =>
      e("div", { key: s._id, className: "list-group-item d-flex justify-content-between align-items-center" },
        e("span", null, s.name + " · " + money(s.minPrice) + " – " + money(s.maxPrice) + (s.isActive ? "" : " · Inactive")),
        e("button", { className: "btn btn-outline-primary", disabled: busy, onClick: () => {
          setId(s._id); setForm({ name: s.name, category: s.category, description: s.description, minPrice: s.minPrice, maxPrice: s.maxPrice, isActive: s.isActive }); setMessage("");
        } }, "Edit")))));
}
