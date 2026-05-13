import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Layers, Settings2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.platformRole !== "PLATFORM_SUPER_ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div>
            <p className="ds-label text-primary">Platform Console</p>
            <h1 className="text-lg font-semibold text-foreground">Performance Management Platform</h1>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/platform/home" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Layers className="size-3.5" />
              Modules
            </Link>
            <Link href="/platform/setup" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Building2 className="size-3.5" />
              Setup
            </Link>
            <Link href="/platform/super-admin" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Settings2 className="size-3.5" />
              Registry
            </Link>
            <ThemeToggle />
            <div className="rounded-lg border border-border bg-background px-1 py-1">
              <SignOutButton expanded={false} />
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
