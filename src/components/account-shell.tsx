"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { getOrganizationLogoUrl } from "@/lib/organization-branding";
import {
  Building2,
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  Ticket,
  ShieldCheck,
  Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/account/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/account/organizations", label: "Organizations", icon: Building2 },
  { href: "/account/users", label: "Users", icon: Users },
  { href: "/account/billing", label: "Billing", icon: CreditCard },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/account/tickets", label: "Support Tickets", icon: Ticket, group: "Management" },
  { href: "/account/passkeys", label: "Passkey Resets", icon: ShieldCheck, group: "Management" },
  { href: "/account/notifications", label: "Notification Center", icon: Bell, group: "Management" },
];

type Props = {
  name: string;
  email?: string | null;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  children: React.ReactNode;
};

export function AccountShell({ name, email, organizationName, organizationLogoUrl, children }: Props) {
  const pathname = usePathname();
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";
  const activeOrganizationName = organizationName?.trim() || "Account";
  const logoSrc = getOrganizationLogoUrl(organizationLogoUrl);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="group/sidebar sticky top-0 hidden h-screen w-16 shrink-0 overflow-visible transition-[width] duration-300 ease-out will-change-[width] hover:w-[244px] md:block">
        <aside
          className="flex h-full w-full flex-col overflow-hidden"
          style={{ background: "#181b22", borderRight: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Logo area */}
          <div className="flex h-16 items-center px-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <Link href="/account/dashboard" className="flex min-w-0 items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/95 p-1 shadow-sm">
                <Image
                  src={logoSrc}
                  alt={activeOrganizationName}
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </div>
              <span className="truncate text-sm font-semibold text-white/90 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 whitespace-nowrap">
                {activeOrganizationName}
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
            {NAV_ITEMS.map((item, index) => {
              const showHeading =
                item.group &&
                (index === 0 || NAV_ITEMS[index - 1]?.group !== item.group);
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <div key={item.href}>
                  {showHeading && (
                    <div className="px-2 pb-0.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 whitespace-nowrap overflow-hidden">
                      {item.group}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    className={`flex h-9 w-full items-center gap-3 rounded-lg px-2 transition-colors ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 whitespace-nowrap">
                      {item.label}
                    </span>
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div
            className="grid grid-cols-[36px_minmax(0,1fr)_28px_28px] items-center gap-2 px-3 py-3 overflow-hidden"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="size-[30px] justify-self-center rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initial}
            </div>
            <div className="min-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-200 ease-out group-hover/sidebar:opacity-100">
              <div className="truncate text-xs font-semibold text-white/90">{name}</div>
              {email && <div className="truncate text-[10px] text-white/40">{email}</div>}
            </div>
            <div className="max-w-0 shrink-0 overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover/sidebar:max-w-8 group-hover/sidebar:opacity-100">
              <ThemeToggle />
            </div>
            <div className="max-w-0 shrink-0 overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover/sidebar:max-w-8 group-hover/sidebar:opacity-100">
              <SignOutButton expanded={false} />
            </div>
          </div>
        </aside>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
