import { redirect } from "next/navigation";

// LOD (Loss of Day) maps to the existing LOP (Loss of Pay) manager.
export default function LodPage() {
  redirect("/admin/ot/lop");
}
