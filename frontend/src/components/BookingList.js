import React, { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.js";
import { e, field, select, alert, money, todayIST, Access, useRemote } from "./ui.js";
function ReviewForm({ onSubmit, busy }) {
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  return e("form", { className: "mt-3", onSubmit: (ev) => { ev.preventDefault(); onSubmit({ rating: Number(rating), review }); } },
    select("Rating", { value: rating, onChange: (ev) => setRating(ev.target.value) }, [1, 2, 3, 4, 5].map((n) => [n, n + " stars"])),
    field("Review", { value: review, onChange: (ev) => setReview(ev.target.value) }),
    e("button", { className: "btn btn-outline-primary", disabled: busy }, "Submit review"));
}
export default function BookingList({ role, path, title }) {
  const { user } = useAuth();
  const { data, error, loading, reload } = useRemote(user?.role === role ? path : null);
  const [failure, setFailure] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(b, action, body) {
    setBusy(true); setFailure(""); setMessage("");
    const base = role === "professional" ? "/api/jobs/" : "/api/bookings/";
    try {
      const result = await api(base + b._id + "/" + action, { method: "PATCH", body });
      setMessage(action === "decline" ? (result.status === "cancelled" ? "No replacement available; booking cancelled." : "Booking assigned to another professional.") : "Booking updated.");
      reload();
    } catch (err) { setFailure(err.message); reload(); } finally { setBusy(false); }
  }
  return e(Access, { role }, e("h2", null, title),
    e("button", { className: "btn btn-outline-secondary mb-3", onClick: reload, disabled: loading || busy }, "Refresh bookings"),
    alert(error || failure), alert(message, "success"), loading ? e("p", null, "Loading bookings…") :
    e("div", { className: "row g-3 mb-4" }, !data.length && !error && e("p", null, "No bookings yet."), data.map((b) => {
      const confirmed = b.status === "confirmed";
      const beforeDate = b.date > todayIST();
      const completed = b.status === "completed";
      const unpaid = b.paymentStatus === "unpaid";
      const button = (label, action, body, style = "outline-primary") => e("button", {
        type: "button", className: "btn btn-" + style + " me-2 mb-2", disabled: busy, onClick: () => act(b, action, body)
      }, label);
      return e("div", { className: "col-lg-6", key: b._id }, e("article", { className: "card p-3 h-100" },
        e("h3", { className: "h5" }, b.service?.name || "Service unavailable"),
        e("p", { className: "mb-1" }, b.date + " · " + b.slot + " (IST)"),
        e("p", { className: "mb-1" }, "Status: " + b.status.replaceAll("_", " ")),
        e("p", { className: "mb-1" }, "Price: " + money(b.price) + " · " + b.paymentStatus + (b.paymentMethod ? " (" + b.paymentMethod + ")" : "")),
        e("p", { className: "mb-1" }, "Address: " + b.address + ", " + b.pincode),
        e("p", { className: "mb-1" }, "Professional: " + (b.professional?.name || "Unavailable") + (b.professional?.phone ? " · " + b.professional.phone : "")),
        e("p", null, "Customer: " + (b.customer?.name || "Unavailable") + (b.customer?.phone ? " · " + b.customer.phone : "")),
        e("div", null,
          role === "customer" && confirmed && beforeDate && button("Cancel booking", "cancel", undefined, "outline-danger"),
          role === "customer" && completed && unpaid && button("Pay online (simulated)", "pay"),
          role === "professional" && confirmed && button("Start job", "status", { status: "in_progress" }),
          role === "professional" && b.status === "in_progress" && button("Complete job", "status", { status: "completed" }),
          role === "professional" && confirmed && beforeDate && button("Decline job", "decline", undefined, "outline-danger"),
          role === "professional" && completed && unpaid && button("Mark cash received", "cash")),
        b.rating != null && e("p", null, "Rating: " + b.rating + "/5" + (b.review ? " · " + b.review : "")),
        role === "customer" && completed && b.rating == null && e(ReviewForm, { busy, onSubmit: (body) => act(b, "review", body) })));
    })));
}
