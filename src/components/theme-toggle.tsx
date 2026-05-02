"use client";

import { Sun, Moon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme-provider";

function useIsHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useIsHydrated();
  if (!hydrated) return <div className="size-8" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center size-8 rounded-lg text-[#666] hover:text-[#d0d0d0] dark:hover:text-[#d0d0d0] hover:bg-black/5 dark:hover:bg-white/[0.04] transition-all duration-200"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
