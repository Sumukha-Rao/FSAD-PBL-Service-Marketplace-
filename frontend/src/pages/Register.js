// Member 1: signup form for customers and professionals.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.js";

const e = React.createElement;

export default function Register() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", experienceYears: "" });
  const [isPro, setIsPro] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(""); setBusy(true);
    const url = isPro ? "/api/auth/register-pro" : "/api/auth/register";
    try {
      setUser(await api(url, { method: "POST", body: { ...form, experienceYears: Number(form.experienceYears || 0) } }));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  const input = (name, type) =>
    e("input", {
      className: "form-control mb-2",
      type,
      placeholder: name,
      "aria-label": name,
      ...(name === "experienceYears" ? { min: 0, step: "any" } : {}),
      required: true,
      value: form[name],
      onChange: (event) => setForm({ ...form, [name]: event.target.value })
    });

  return e(
    "form",
    { className: "col-md-4", onSubmit: submit },
    e("h2", null, "Register"),
    error && e("div", { className: "alert alert-danger" }, error),
    input("name", "text"),
    input("email", "email"),
    input("password", "password"),
    input("phone", "tel"),
    e(
      "label",
      { className: "form-check mb-2" },
      e("input", { className: "form-check-input", type: "checkbox", checked: isPro, onChange: () => setIsPro(!isPro) }),
      " Join as a professional"
    ),
    isPro && input("experienceYears", "number"),
    e("button", { className: "btn btn-primary", disabled: busy }, busy ? "Registering…" : "Register")
  );
}
