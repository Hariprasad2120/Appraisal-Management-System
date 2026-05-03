"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithCredentials } from "./actions";

export function LoginForm() {
  const params = useSearchParams();
  const rawCallbackUrl = params.get("callbackUrl") ?? "/";
  const callbackUrl = rawCallbackUrl.startsWith("/") &&
    !rawCallbackUrl.startsWith("//") &&
    !rawCallbackUrl.startsWith("/api/") &&
    !/\.[a-z0-9]+(?:$|\?)/i.test(rawCallbackUrl)
    ? rawCallbackUrl
    : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const caseSensitiveInputStyle = {
    fontFamily: "Arial, Helvetica, sans-serif",
    letterSpacing: "0",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("callbackUrl", callbackUrl);
      formData.set("userAgent", navigator.userAgent);

      const res = await loginWithCredentials(formData);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      window.location.assign(res.redirectTo);
    } catch {
      setErr("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl shadow-md p-7 w-full">
      {/* Header */}
      <div className="mb-7">
        <h2 className="ds-h2">Welcome back</h2>
        <p className="ds-body mt-1">
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-medium text-muted-foreground"
          >
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
            placeholder="name@adarshshipping.in"
            className="h-11 bg-input border-border normal-case focus:border-primary focus:ring-primary/20 transition-all duration-200"
            style={caseSensitiveInputStyle}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-medium text-muted-foreground"
          >
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
              style={caseSensitiveInputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {err && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.2 }}
              role="alert"
              className="flex items-center gap-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
            >
              <AlertCircle className="size-4 shrink-0" />
              {err}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          className="relative w-full h-11 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none cursor-pointer overflow-hidden bg-gradient-teal hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
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
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Contact your administrator if you need access
      </p>
    </div>
  );
}
