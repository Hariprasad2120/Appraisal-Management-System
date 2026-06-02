import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/rbac";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { role } = session.user;
  redirect(ROLE_HOME[role]);
}
