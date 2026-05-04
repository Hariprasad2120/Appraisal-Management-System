"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 min
const WARNING_BEFORE_MS = 60_000;     // warn 1 min before timeout
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
const TIMEOUT_WARNING_TOAST_ID = "session-timeout-warning";

type Props = {
  timeoutMinutes: number;
};

export function InactivityGuard({ timeoutMinutes }: Props) {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const lastActivityRef = useRef<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const warningShownRef = useRef(false);
  const timedOutRef = useRef(false);

  const resetActivity = useCallback(() => {
    if (warningShownRef.current) return;
    lastActivityRef.current = Date.now();
  }, []);

  const renewActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    timedOutRef.current = false;
    setShowWarning(false);
    toast.dismiss(TIMEOUT_WARNING_TOAST_ID);
  }, []);

  const doTimeout = useCallback(async () => {
    if (timedOutRef.current) return;
    timedOutRef.current = true;
    try {
      await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "TIMEOUT" }),
      });
    } catch {
      // silent
    }
    await signOut({ callbackUrl: "/login?reason=timeout" });
    window.location.assign("/login?reason=timeout");
  }, []);

  const stayLoggedIn = useCallback(() => {
    renewActivity();
    // Refresh heartbeat
    fetch("/api/session/heartbeat", { method: "POST" }).catch(() => {});
  }, [renewActivity]);

  const sendTimeoutWarning = useCallback((remainingMs: number) => {
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    toast.warning("Session expiring soon", {
      id: TIMEOUT_WARNING_TOAST_ID,
      description: `You will be signed out in about ${remainingSeconds} seconds due to inactivity.`,
      duration: Infinity,
      action: {
        label: "Stay logged in",
        onClick: stayLoggedIn,
      },
    });

    fetch("/api/session/timeout-warning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secondsLeft: remainingSeconds }),
    }).catch(() => {});
  }, [stayLoggedIn]);

  // Listen for user activity
  useEffect(() => {
    lastActivityRef.current = Date.now();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetActivity));
    };
  }, [resetActivity]);

  // Heartbeat every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (warningShownRef.current || timedOutRef.current) return;
      fetch("/api/session/heartbeat", { method: "POST" }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Inactivity checker every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      const remaining = timeoutMs - idle;

      if (remaining <= 0) {
        doTimeout();
        return;
      }

      if (remaining <= WARNING_BEFORE_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        setShowWarning(true);
        setSecondsLeft(Math.ceil(remaining / 1000));
        sendTimeoutWarning(remaining);
      }

      if (showWarning && remaining <= WARNING_BEFORE_MS) {
        setSecondsLeft(Math.ceil(remaining / 1000));
      }
    }, 1_000);
    return () => clearInterval(interval);
  }, [timeoutMs, doTimeout, sendTimeoutWarning, showWarning]);

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 24, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 24, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-4 right-4 z-[99999] w-[380px] max-w-[calc(100vw-2rem)]"
        >
          <div className="relative bg-[#0d1117] border border-amber-500/40 rounded-2xl shadow-2xl p-7 w-full overflow-hidden">
            {/* Pulsing bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 animate-pulse rounded-l-2xl" />

            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Session Expiring Soon</h3>
                <p className="text-xs text-white/50 mt-0.5">Your session is about to expire due to inactivity</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 py-4 mb-5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Clock className="size-4 text-amber-400" />
              <span className="text-2xl font-bold text-amber-400 tabular-nums">
                {secondsLeft}s
              </span>
              <span className="text-xs text-white/40">remaining</span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={stayLoggedIn}
                className="flex-1 h-10 bg-[#008993] hover:bg-[#00cec4] text-white font-semibold text-sm"
              >
                Stay Logged In
              </Button>
              <Button
                onClick={doTimeout}
                variant="outline"
                className="flex-1 h-10 text-sm text-white/50 hover:text-white border-border"
              >
                Log Out Now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
