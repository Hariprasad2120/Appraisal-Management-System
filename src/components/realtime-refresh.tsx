"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RealtimeRefresh() {
  const router = useRouter();
  const lastVersion = useRef<number | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/realtime/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { version?: number };
        const version = Number(data.version ?? 0);
        if (lastVersion.current === null) {
          lastVersion.current = version;
          return;
        }
        if (version > lastVersion.current) {
          lastVersion.current = version;
          startTransition(() => router.refresh());
        }
      } catch {
        // Keep the UI quiet if the network blips.
      }
    }

    void tick();
    const interval = window.setInterval(() => {
      if (!cancelled && document.visibilityState === "visible") void tick();
    }, 10_000);
    const onFocus = () => void tick();
    const onRealtimeHint = () => void tick();
    window.addEventListener("focus", onFocus);
    window.addEventListener("ams:realtime-hint", onRealtimeHint);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("ams:realtime-hint", onRealtimeHint);
    };
  }, [router]);

  return null;
}
