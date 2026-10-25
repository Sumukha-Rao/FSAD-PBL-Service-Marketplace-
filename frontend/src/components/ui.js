import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.js";
import { api } from "../api.js";
export const e = React.createElement;
export const categories = ["ac", "cleaning", "painting", "plumbing", "electrical", "appliance"];
export const slots = ["09-11", "11-13", "14-16", "16-18"];
export const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const money = (value) => "₹" + Number(value).toLocaleString("en-IN");
export const alert = (message, kind = "danger") => message && e("div", { className: "alert alert-" + kind, role: "alert" }, message);
export function field(label, props) {
  return e("label", { className: "d-block mb-3" }, label, e("input", { className: "form-control", ...props }));
}
export function select(label, props, values) {
  return e("label", { className: "d-block mb-3" }, label, e("select", { className: "form-select", "aria-label": label, ...props },
    values.map(([value, text]) => e("option", { key: value, value }, text))));
}
export function Access({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return e("p", null, "Restoring session…");
  if (!user) return e("p", null, e(Link, { to: "/login" }, "Log in"), " to continue.");
  if (user.role !== role) return alert("This page is for " + role + " accounts.");
  return children;
}
export function useRemote(path) {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!path) { setData([]); setError(""); setLoading(false); return; }
    let current = true;
    setLoading(true); setError(""); setData([]);
    api(path).then((value) => { if (current) setData(value); })
      .catch((err) => { if (current) setError(err.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [path, version]);
  return { data, error, loading, reload };
}
