"use client"

import { Toaster as Sonner, toast, useSonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon, XIcon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

const STANDARD_TOAST_DURATION_MS = 5000

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        position="top-center"
        richColors
        closeButton
        className="toaster group"
        icons={{
          success: (
            <CircleCheckIcon className="size-4" />
          ),
          info: (
            <InfoIcon className="size-4" />
          ),
          warning: (
            <TriangleAlertIcon className="size-4" />
          ),
          error: (
            <OctagonXIcon className="size-4" />
          ),
          loading: (
            <Loader2Icon className="size-4 animate-spin" />
          ),
        }}
        style={
          {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)",
          } as React.CSSProperties
        }
        toastOptions={{
          duration: STANDARD_TOAST_DURATION_MS,
          classNames: {
            toast: "cn-toast border-border/80 bg-popover/95 shadow-lg backdrop-blur",
            title: "text-sm font-normal tracking-normal",
            description: "text-xs font-light text-muted-foreground",
            actionButton: "bg-primary text-primary-foreground",
            cancelButton: "bg-muted text-muted-foreground",
          },
        }}
        {...props}
      />
      <DismissAllToasts />
    </>
  )
}

function DismissAllToasts() {
  const { toasts } = useSonner()
  const dismissibleToasts = toasts.filter((item) => item.type !== "loading")

  if (dismissibleToasts.length === 0) return null

  return (
    <button
      type="button"
      onClick={() => toast.dismiss()}
      className="fixed right-4 top-20 z-[10000] inline-flex items-center gap-1.5 rounded-full border border-border bg-popover/95 px-3 py-1.5 text-[11px] font-normal text-muted-foreground shadow-lg backdrop-blur transition-colors hover:text-foreground"
      aria-label="Dismiss all notifications"
    >
      <XIcon className="size-3" />
      Dismiss all
    </button>
  )
}

export { Toaster }
