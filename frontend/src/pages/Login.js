// Member 1: login form.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.js";

const e = React.createElement;

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(""); setBusy(true);
    try {
      setUser(await api("/api/auth/login", { method: "POST", body: form }));
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
    e("h2", null, "Login"),
    error && e("div", { className: "alert alert-danger" }, error),
    input("email", "email"),
    input("password", "password"),
    e("button", { className: "btn btn-primary", disabled: busy }, busy ? "Logging in…" : "Login")
  );
}
