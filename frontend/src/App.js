import React, { useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.js";
import Home from "./pages/Home.js";
import Login from "./pages/Login.js";
import Register from "./pages/Register.js";
import AdminPros from "./pages/AdminPros.js";
import Services from "./pages/Services.js";
import ProProfile from "./pages/ProProfile.js";
import AdminServices from "./pages/AdminServices.js";
import BookService from "./pages/BookService.js";
import MyBookings from "./pages/MyBookings.js";
import ProJobs from "./pages/ProJobs.js";
import AdminBookings from "./pages/AdminBookings.js";

const e = React.createElement;

// Navbar links for each role ("guest" = not logged in).
const links = {
  guest: [["/services", "Services"], ["/login", "Login"], ["/register", "Register"]],
  customer: [["/services", "Services"], ["/bookings", "My bookings"]],
  professional: [["/pro/profile", "My profile"], ["/pro/jobs", "My jobs"]],
  admin: [["/admin/pros", "Professionals"], ["/admin/services", "Services"], ["/admin/bookings", "Bookings"]]
};

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const pending = user && user.approvalStatus && user.approvalStatus !== "approved";

  return e(
    "nav",
    { className: "navbar navbar-expand bg-dark navbar-dark px-3 mb-4" },
    e(Link, { className: "navbar-brand", to: "/" }, "HomeEase"),
    e(
      "div",
      { className: "navbar-nav me-auto flex-wrap" },
      links[user ? user.role : "guest"].map(([to, label]) => e(Link, { key: to, className: "nav-link", to }, label))
    ),
    user && e("span", { className: "navbar-text me-3" }, user.name + (pending ? " (" + user.approvalStatus + ")" : "")),
    user && e("button", { className: "btn btn-sm btn-outline-light", onClick: () => { setError(""); logout().then(() => navigate("/")).catch((err) => setError(err.message)); } }, "Logout"),
    error && e("span", { role: "alert", className: "text-warning ms-2" }, error)
  );
}

export default function App() {
  return e(
    React.Fragment,
    null,
    e(Navbar),
    e(
      "main",
      { className: "container" },
      e(
        Routes,
        null,
        e(Route, { path: "/", element: e(Home) }),
        e(Route, { path: "/login", element: e(Login) }),
        e(Route, { path: "/register", element: e(Register) }),
        e(Route, { path: "/admin/pros", element: e(AdminPros) }),
        e(Route, { path: "/services", element: e(Services) }),
        e(Route, { path: "/pro/profile", element: e(ProProfile) }),
        e(Route, { path: "/admin/services", element: e(AdminServices) }),
        e(Route, { path: "/book/:serviceId", element: e(BookService) }),
        e(Route, { path: "/bookings", element: e(MyBookings) }),
        e(Route, { path: "/pro/jobs", element: e(ProJobs) }),
        e(Route, { path: "/admin/bookings", element: e(AdminBookings) })
      )
    )
  );
}
