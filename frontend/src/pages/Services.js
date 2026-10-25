import React, { useState } from "react";
import { Link } from "react-router-dom";
import { e, categories, select, alert, money, useRemote } from "../components/ui.js";
export default function Services() {
  const [category, setCategory] = useState("");
  const { data, error, loading } = useRemote("/api/services" + (category ? "?category=" + category : ""));
  return e("div", null, e("h2", null, "Services"),
    select("Category", { value: category, onChange: (ev) => setCategory(ev.target.value) }, [["", "All categories"], ...categories.map((c) => [c, c])]),
    alert(error), loading ? e("p", null, "Loading services…") :
    e("div", { className: "row g-3" }, data.length === 0 && e("p", null, "No services available."), data.map((s) =>
      e("div", { key: s._id, className: "col-md-4" }, e("article", { className: "card p-3 h-100" },
        e("h3", { className: "h5" }, s.name), e("p", null, s.description),
        e("p", null, money(s.minPrice) + " – " + money(s.maxPrice)),
        e(Link, { className: "btn btn-primary", to: "/book/" + s._id }, "Book service"))))));
}
