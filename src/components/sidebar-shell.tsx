"use client";

import Link from "next/link";
import Image from "next/image";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import type { Role } from "@/generated/prisma/enums";

const roleColors: Record<Role, string> = {
  ADMIN: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  MANAGEMENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  MANAGER: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  HR: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  TL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  EMPLOYEE: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  PARTNER: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

const LOGO_SRC = "/api/logo?v=2";

type Props = {
  role: Role;
  secondaryRole?: Role | null;
  name: string;
  homeHref: string;
};

export function SidebarShell({ role, secondaryRole, name, homeHref }: Props) {
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="group/sidebar sticky top-0 hidden h-screen w-16 shrink-0 overflow-visible transition-[width] duration-300 ease-out will-change-[width] hover:w-[244px] md:block">
      <aside
        className="flex h-full w-full flex-col overflow-hidden"
        style={{
          background: "#181b22",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo area */}
        <div
          className="flex h-16 items-center overflow-hidden px-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Link
            href={homeHref}
            className="relative flex h-10 w-full items-center overflow-hidden"
            title="Adarsh Shipping"
          >
            <Image
              src={LOGO_SRC}
              alt="Adarsh Shipping"
              width={160}
              height={54}
              className="absolute left-0 h-9 w-auto max-w-[40px] object-contain opacity-100 transition-opacity duration-150 ease-out group-hover/sidebar:opacity-0"
              unoptimized
            />
            <Image
              src={LOGO_SRC}
              alt=""
              width={160}
              height={54}
              aria-hidden="true"
              className="absolute left-0 h-10 w-auto max-w-[170px] object-contain opacity-0 transition-opacity duration-200 ease-out group-hover/sidebar:opacity-100"
              unoptimized
            />
          </Link>
        </div>

        {/* Nav */}
        <SidebarNav role={role} secondaryRole={secondaryRole} />

        {/* User footer */}
        <div
          className="grid grid-cols-[36px_minmax(0,1fr)_28px_28px] items-center gap-2 px-3 py-3 overflow-hidden"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="contents">
            <div className="size-[30px] justify-self-center rounded-full bg-gradient-teal flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-200 ease-out group-hover/sidebar:opacity-100">
              <div className="truncate text-xs font-semibold text-white/90">{name}</div>
              <div
                title={role}
                className={`mt-0.5 block w-fit max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-medium leading-none ${roleColors[role]}`}
              >
                {role}
              </div>
            </div>
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
  );
}
