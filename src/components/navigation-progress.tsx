"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname + searchParams.toString());

  useEffect(() => {
    const current = pathname + searchParams.toString();

    if (current !== prevPathRef.current) {
      prevPathRef.current = current;
      // Navigation complete — jump to 100 then hide
      setWidth(100);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      timerRef.current = setTimeout(() => {
        setLoading(false);
        setWidth(0);
      }, 300);
    }
  }, [pathname, searchParams]);

  // Intercept <a> clicks to start the bar
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto")) return;
      // Same page anchor or external — skip
      const isSamePath = href === pathname || href === pathname + window.location.search;
      if (isSamePath) return;

      // Start progress
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setWidth(8);
      setLoading(true);

      // Slowly increment to 85% simulating load
      let current = 8;
      intervalRef.current = setInterval(() => {
        current += (85 - current) * 0.12;
        setWidth(Math.min(current, 85));
      }, 120);
    }

    document.addEventListener("click", onLinkClick);
    return () => {
      document.removeEventListener("click", onLinkClick);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-[#008993] via-[#00cec4] to-[#008993] shadow-[0_0_8px_rgba(0,137,147,0.8)]"
            style={{ width: `${width}%` }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
          {/* Glow pulse at the tip */}
          <div
            className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent to-[#00cec4]/60"
            style={{ left: `calc(${width}% - 80px)` }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
