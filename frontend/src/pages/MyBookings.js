import { e } from "../components/ui.js";
import BookingList from "../components/BookingList.js";
export default function MyBookings() {
  return e(BookingList, { role: "customer", path: "/api/bookings/mine", title: "My bookings" });
}
