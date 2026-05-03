"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SignOutButton({ expanded }: { expanded: boolean }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

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
    <>
      <button
        onClick={() => setOpen(true)}
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={!loading}>
          <DialogHeader>
            <DialogTitle>Sign Out?</DialogTitle>
            <DialogDescription>
              You will return to the login page and this session will be ended.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Signing out..." : "Sign out"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
