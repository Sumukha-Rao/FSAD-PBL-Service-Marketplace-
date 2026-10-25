// Member 1: admin approves or rejects professionals.
import React, { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.js";
import { Access, useRemote } from "../components/ui.js";

const e = React.createElement;

export default function AdminPros() {
  const { user } = useAuth();
  const { data: pros, loading, error: loadError, reload } = useRemote(user?.role === "admin" ? "/api/admin/pros" : null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function decide(id, approvalStatus) {
    setError(""); setBusy(true);
    try { await api("/api/admin/pros/" + id, { method: "PATCH", body: { approvalStatus } }); reload(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return e(
    Access,
    { role: "admin" },
    e("h2", null, "Professionals"),
    (error || loadError) && e("div", { className: "alert alert-danger", role: "alert" }, error || loadError),
    loading && e("p", null, "Loading professionals…"),
    e(
      "table",
      { className: "table" },
      e("thead", null, e("tr", null, ["Name", "Email", "Phone", "Experience", "Status", ""].map((h) => e("th", { key: h }, h)))),
      e(
        "tbody",
        null,
        pros.map((p) =>
          e(
            "tr",
            { key: p._id },
            e("td", null, p.name),
            e("td", null, p.email),
            e("td", null, p.phone),
            e("td", null, (p.experienceYears ?? 0) + " yrs"),
            e("td", null, p.approvalStatus),
            e(
              "td",
              null,
              p.approvalStatus !== "approved" &&
                e("button", { className: "btn btn-sm btn-success me-2", disabled: busy || loading, onClick: () => decide(p._id, "approved") }, "Approve"),
              p.approvalStatus !== "rejected" &&
                e("button", { className: "btn btn-sm btn-outline-danger", disabled: busy || loading, onClick: () => decide(p._id, "rejected") }, "Reject")
            )
          )
        )
      )
    )
  );
}
