"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Clock3 } from "lucide-react";

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

export function AppHeader({ userName }: { userName: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const firstName = useMemo(
    () => toTitleCase(userName.split(" ")[0] || "there"),
    [userName]
  );

  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const dateKey = new Date().toISOString().slice(0, 10);
    const storageKey = `welcome-toast:${userName}:${dateKey}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "shown");
    toast.success(`Welcome back, ${firstName}`, {
      description: "Your performance workspace is ready.",
    });
  }, [firstName, userName]);

  const greeting = now ? getGreeting(now) : "Good Day";
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
    <header
      className="border-b border-border/70 bg-background/90 px-4 py-4 backdrop-blur md:px-6"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="ds-label text-primary">Performance Management</p>
          <h1 className="mt-1 text-xl font-normal tracking-normal text-foreground md:text-2xl">
            {greeting}, {firstName}
          </h1>
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
    </header>
  );
}
