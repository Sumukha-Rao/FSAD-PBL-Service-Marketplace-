import { e } from "../components/ui.js";
import BookingList from "../components/BookingList.js";
export default function AdminBookings() {
  return e(BookingList, { role: "admin", path: "/api/admin/bookings", title: "All bookings" });
}
