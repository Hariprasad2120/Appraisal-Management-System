"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Building2,
  CalendarDays,
  Clock3,
  Layers3,
  LayoutDashboard,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getOrganizationLogoUrl } from "@/lib/organization-branding";
import {
  getVisibleWorkspaces,
  getWorkspaceDefinition,
  getWorkspaceForPath,
  getWorkspaceStatusLabel,
} from "@/lib/workspace-navigation";

type OrganizationOption = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  status: string;
  roles: string[];
};

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getGreetingPeriod(date: Date | null) {
  if (!date) return "afternoon";
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function AppHeader({
  userName,
  organizationName,
  sessionToken,
  enabledModules,
  organizationOptions,
  accountName,
  showAccountActions,
}: {
  userName: string;
  organizationName: string;
  sessionToken: string;
  enabledModules: string[];
  organizationOptions: OrganizationOption[];
  accountName: string | null;
  showAccountActions: boolean;
}) {
  const pathname = usePathname();
  const [now, setNow] = useState<Date | null>(null);
  const firstName = useMemo(
    () => toTitleCase(userName.split(" ")[0] || "there"),
    [userName],
  );
  const workspaces = useMemo(
    () => getVisibleWorkspaces(enabledModules),
    [enabledModules],
  );
  const currentWorkspaceKey =
    getWorkspaceForPath(pathname) ?? workspaces[0]?.key ?? null;
  const currentWorkspace = currentWorkspaceKey
    ? getWorkspaceDefinition(currentWorkspaceKey)
    : null;

  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const storageKey = `welcome-toast:${sessionToken}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "shown");
    toast.success(`Welcome back, ${firstName}`, {
      description: "Your workspace is ready.",
      duration: 5000,
      position: "top-center",
    });
  }, [firstName, sessionToken]);

  const greeting = now ? getGreeting(now) : "Good Day";
  const greetingPeriod = getGreetingPeriod(now);
  const dateLabel = now
    ? now.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Loading date";
  const timeLabel = now
    ? now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  return (
    <header className="border-b border-border/70 bg-background/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="ds-label text-primary">{organizationName}</p>
            <h1 className="mt-1 flex items-center gap-3 text-xl font-normal tracking-normal text-foreground md:text-2xl">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                {greetingPeriod === "morning" ? (
                  <Sunrise className="size-[18px] text-primary" />
                ) : greetingPeriod === "evening" ? (
                  <Sunset className="size-[18px] text-primary" />
                ) : (
                  <Sun className="size-[18px] text-primary" />
                )}
              </span>
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {currentWorkspace
                ? `${currentWorkspace.label} is active for this organization.`
                : "Use the sidebar to open a workspace."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
              <CalendarDays className="size-4 text-primary" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-normal tabular-nums text-foreground">
              <Clock3 className="size-4 text-primary" />
              {timeLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
              <Building2 className="size-4 text-primary" />
              <span className="font-medium">{organizationName}</span>
            </div>
            {currentWorkspace ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                <Layers3 className="size-4 text-primary" />
                <span className="font-medium">{currentWorkspace.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${currentWorkspace.badgeClass}`}>
                  {getWorkspaceStatusLabel(currentWorkspace)}
                </span>
              </div>
            ) : null}
            {accountName ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <LayoutDashboard className="size-3.5" />
                {accountName}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OrganizationSwitcher organizationOptions={organizationOptions} />
            {showAccountActions ? (
              <Link
                href="/account/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <LayoutDashboard className="size-4 text-primary" />
                Account dashboard
              </Link>
            ) : null}
            <Link
              href="/account/organizations"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <ArrowRightLeft className="size-4 text-primary" />
              All organizations
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function OrganizationSwitcher({
  organizationOptions,
}: {
  organizationOptions: OrganizationOption[];
}) {
  if (organizationOptions.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
        <ArrowRightLeft className="size-4 text-primary" />
        Switch organization
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Organization contexts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizationOptions.map((organization) => (
          <DropdownMenuItem key={organization.id} className="p-0">
            <Link
              href="/account/organizations"
              className="flex w-full items-start gap-3 px-2 py-2"
            >
              <span className="mt-0.5 flex size-8 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                <Image
                  src={getOrganizationLogoUrl(organization.logoUrl)}
                  alt={organization.name}
                  width={32}
                  height={32}
                  className="h-full w-full object-contain p-1"
                  unoptimized
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {organization.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  /{organization.slug} · {formatRoles(organization.roles)}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatRoles(roles: string[]) {
  return roles
    .slice(0, 2)
    .map((role) =>
      role
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    )
    .join(", ");
}
