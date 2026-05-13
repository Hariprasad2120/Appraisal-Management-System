"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithCredentials, requestPasswordResetAction } from "./actions";

type Step = "login" | "forgot-password";

export function LoginForm() {
  const params = useSearchParams();
  const rawCallbackUrl = params.get("callbackUrl") ?? "/role-redirect";
  const callbackUrl = rawCallbackUrl.startsWith("/") &&
    !rawCallbackUrl.startsWith("//") &&
    !rawCallbackUrl.startsWith("/api/") &&
    !/\.[a-z0-9]+(?:$|\?)/i.test(rawCallbackUrl)
    ? rawCallbackUrl
    : "/role-redirect";

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("callbackUrl", callbackUrl);
      const res = await loginWithCredentials(formData);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      window.location.assign(res.redirectTo);
    } finally {
      setLoading(false);
    }
  }

  async function onRequestPasswordReset() {
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      const res = await requestPasswordResetAction(formData);
      setInfo(res.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-7 shadow-md">
      <div className="mb-7">
        <h2 className="ds-h2">Welcome back</h2>
        <p className="ds-body mt-1">
          Sign in with your work email and password to open your workspace.
        </p>
      </div>

      {info ? (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          {info}
        </div>
      ) : null}

      <AnimatePresence>
        {err ? (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            role="alert"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          >
            <AlertCircle className="size-4 shrink-0" />
            {err}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {step === "login" ? (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="name@company.com"
              className="h-11 bg-input border-border normal-case focus:border-primary focus:ring-primary/20 transition-all duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Enter your password"
                className="h-11 pr-10 bg-input border-border normal-case focus:border-primary focus:ring-primary/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPw((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="relative h-11 w-full cursor-pointer overflow-hidden rounded-xl bg-gradient-teal text-sm font-semibold text-white transition-all duration-200 disabled:pointer-events-none disabled:opacity-60 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="size-4" />
                </>
              )}
            </span>
          </motion.button>

          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => setStep("forgot-password")} className="text-primary hover:underline">
              Forgot password?
            </button>
            <Link href="/request-demo" className="text-muted-foreground hover:text-foreground">
              Need access?
            </Link>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Enter your registered work email. If it exists, a reset link will be sent.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="resetEmail" className="text-xs font-medium text-muted-foreground">
              Registered email
            </Label>
            <Input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 bg-input border-border"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onRequestPasswordReset()}
            className="h-11 w-full rounded-xl bg-gradient-teal text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
          <button
            type="button"
            onClick={() => setStep("login")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </button>
        </div>
      )}

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Invite-based onboarding is enabled. Contact your administrator if you need access.
      </p>
    </div>
  );
}
