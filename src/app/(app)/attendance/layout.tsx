import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { attendanceModule } from "@/modules/attendance/module.config";

export default async function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!attendanceModule.canAccess(session.user.role, session.user.secondaryRole)) redirect("/");
  return <>{children}</>;
}
