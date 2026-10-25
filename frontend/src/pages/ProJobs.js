import { e } from "../components/ui.js";
import BookingList from "../components/BookingList.js";
export default function ProJobs() {
  return e(BookingList, { role: "professional", path: "/api/jobs", title: "My jobs" });
}
