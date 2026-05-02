"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton({ expanded }: { expanded: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "LOGGED_OUT" }),
      });
    } catch {
      // silent
    }
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      title={loading ? "Signing out..." : "Sign out"}
      aria-label={loading ? "Signing out" : "Sign out"}
      className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-[4px] transition-all duration-150 text-xs disabled:opacity-50 hover:bg-white/5"
      style={{ color: "#6b7280" }}
    >
      <LogOut className="size-3.5 shrink-0" />
      {expanded && (
        <span className="whitespace-nowrap overflow-hidden">
          {loading ? "Signing out..." : "Sign out"}
        </span>
      )}
    </button>
  );
}
