import { redirect } from "next/navigation";

// Overtime management consolidates under the existing OT records view.
export default function OvertimePage() {
  redirect("/admin/ot/records");
}
