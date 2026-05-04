"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginWithCredentials,
  requestPasskeyResetAction,
  requestPasswordResetAction,
  setupPasskeyAction,
  verifyPasskeyAction,
} from "./actions";

type Step = "password" | "passkey" | "setup" | "forgot-password" | "forgot-passkey";
type PinLength = 4 | 6;

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
  const [passkey, setPasskey] = useState("");
  const [confirmPasskey, setConfirmPasskey] = useState("");
  const [passkeyLength, setPasskeyLength] = useState<PinLength>(4);
  const [challengeToken, setChallengeToken] = useState(params.get("challenge") ?? "");
  const [step, setStep] = useState<Step>(params.get("challenge") ? "passkey" : "password");
  const [activeSetupField, setActiveSetupField] = useState<"passkey" | "confirm">("passkey");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    params.get("provider") === "google" ? "Google verified. Enter your passkey to continue." : null,
  );
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
      setChallengeToken(res.challengeToken);
      setStep(res.passkeySetupRequired ? "setup" : "passkey");
      setPasskey("");
      setConfirmPasskey("");
      setInfo(res.passkeySetupRequired ? "Set your numeric passkey to finish account setup." : "Enter your passkey to continue.");
    } catch {
      setErr("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onPasskeySubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("challengeToken", challengeToken);
      formData.set("passkey", passkey);
      formData.set("callbackUrl", callbackUrl);
      const res = await verifyPasskeyAction(formData);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      window.location.assign(res.redirectTo);
    } finally {
      setLoading(false);
    }
  }

  async function onSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("challengeToken", challengeToken);
      formData.set("passkey", passkey);
      formData.set("confirmPasskey", confirmPasskey);
      formData.set("callbackUrl", callbackUrl);
      const res = await setupPasskeyAction(formData);
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      window.location.assign(res.redirectTo);
    } finally {
      setLoading(false);
    }
  }

  async function onRequest(kind: "password" | "passkey") {
    setErr(null);
    setInfo(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("email", email);
    const res = kind === "password"
      ? await requestPasswordResetAction(formData)
      : await requestPasskeyResetAction(formData);
    setInfo(res.message);
    setLoading(false);
  }

  useEffect(() => {
    if (step !== "passkey" && step !== "setup") return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        if (step === "passkey") {
          setPasskey((current) => current.length >= passkeyLength ? current : `${current}${event.key}`);
          return;
        }
        if (activeSetupField === "passkey") {
          setPasskey((current) => {
            if (current.length >= passkeyLength) {
              setActiveSetupField("confirm");
              setConfirmPasskey((confirm) => confirm.length >= passkeyLength ? confirm : `${confirm}${event.key}`);
              return current;
            }
            const next = `${current}${event.key}`;
            if (next.length >= passkeyLength) setActiveSetupField("confirm");
            return next;
          });
        } else {
          setConfirmPasskey((current) => current.length >= passkeyLength ? current : `${current}${event.key}`);
        }
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        if (step === "passkey") setPasskey((current) => current.slice(0, -1));
        else if (activeSetupField === "passkey") setPasskey((current) => current.slice(0, -1));
        else setConfirmPasskey((current) => current.slice(0, -1));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSetupField, passkeyLength, step]);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-md p-7 w-full">
      {/* Header */}
      <div className="mb-7">
        <h2 className="ds-h2">Welcome back</h2>
        <p className="ds-body mt-1">
          Sign in to your account to continue
        </p>
      </div>

      {info && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          {info}
        </div>
      )}

      {step === "password" && (
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
        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={() => setStep("forgot-password")} className="text-primary hover:underline">
            Forgot password?
          </button>
          <button type="button" onClick={() => setStep("forgot-passkey")} className="text-primary hover:underline">
            Forgot passkey?
          </button>
        </div>
        <Link
          href="/api/auth/signin/google"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <KeyRound className="size-4" />
          Continue with Google
        </Link>
      </form>
      )}

      {step === "passkey" && (
        <form onSubmit={onPasskeySubmit} className="space-y-5">
          <PinLengthSelector
            value={passkeyLength}
            onChange={(next) => {
              setPasskeyLength(next);
              setPasskey((current) => current.slice(0, next));
            }}
          />
          <PinEntry
            label="Enter passkey"
            value={passkey}
            length={passkeyLength}
            onChange={setPasskey}
          />
          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }} className="relative w-full h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-60 bg-gradient-teal">
            {loading ? "Verifying..." : "Verify passkey"}
          </motion.button>
          <button type="button" onClick={() => setStep("forgot-passkey")} className="w-full text-center text-xs text-primary hover:underline">
            Forgot passkey?
          </button>
        </form>
      )}

      {step === "setup" && (
        <form onSubmit={onSetupSubmit} className="space-y-5">
          <PinLengthSelector
            value={passkeyLength}
            onChange={(next) => {
              setPasskeyLength(next);
              setPasskey((current) => current.slice(0, next));
              setConfirmPasskey((current) => current.slice(0, next));
            }}
          />
          <PinEntry
            label="New passkey"
            value={passkey}
            length={passkeyLength}
            onChange={(next) => {
              setPasskey(next);
              if (next.length >= passkeyLength) setActiveSetupField("confirm");
            }}
            onActivate={() => setActiveSetupField("passkey")}
            active={activeSetupField === "passkey"}
            autoFocus
          />
          <PinEntry
            label="Confirm passkey"
            value={confirmPasskey}
            length={passkeyLength}
            onChange={setConfirmPasskey}
            onActivate={() => setActiveSetupField("confirm")}
            active={activeSetupField === "confirm"}
          />
          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }} className="relative w-full h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-60 bg-gradient-teal">
            {loading ? "Saving..." : "Set passkey and continue"}
          </motion.button>
        </form>
      )}

      {step === "forgot-password" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resetEmail" className="text-xs font-medium text-muted-foreground">Registered email</Label>
            <Input id="resetEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-input border-border" />
          </div>
          <button type="button" disabled={loading} onClick={() => onRequest("password")} className="w-full h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-60 bg-gradient-teal">
            Send reset link
          </button>
          <button type="button" onClick={() => setStep("password")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">Back to sign in</button>
        </div>
      )}

      {step === "forgot-passkey" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Passkey resets require admin approval. Submit your registered email and contact admin for approval.</p>
          <div className="space-y-1.5">
            <Label htmlFor="passkeyEmail" className="text-xs font-medium text-muted-foreground">Registered email</Label>
            <Input id="passkeyEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-input border-border" />
          </div>
          <button type="button" disabled={loading} onClick={() => onRequest("passkey")} className="w-full h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-60 bg-gradient-teal">
            Request admin approval
          </button>
          <button type="button" onClick={() => setStep(challengeToken ? "passkey" : "password")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">Back</button>
        </div>
      )}

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Contact your administrator if you need access
      </p>
    </div>
  );
}

function PinLengthSelector({
  value,
  onChange,
}: {
  value: PinLength;
  onChange: (value: PinLength) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Passkey length</p>
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/40 p-1.5">
        {([4, 6] as PinLength[]).map((length) => (
          <button
            key={length}
            type="button"
            onClick={() => onChange(length)}
            className={[
              "h-10 rounded-xl text-sm font-semibold transition-all",
              value === length
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            ].join(" ")}
          >
            {length} digit PIN
          </button>
        ))}
      </div>
    </div>
  );
}

function PinEntry({
  label,
  value,
  length,
  onChange,
  autoFocus,
  onActivate,
  active,
}: {
  label: string;
  value: string;
  length: PinLength;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  onActivate?: () => void;
  active?: boolean;
}) {
  const inputId = `pin-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus && !active) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [active, autoFocus]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          onActivate?.();
          inputRef.current?.focus();
        }}
        className="block w-full text-left"
        aria-label={label}
      >
        <PinSlots label={label} value={value} length={length} />
      </button>
      <input
        ref={inputRef}
        id={inputId}
        value={value}
        onFocus={onActivate}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, length);
          onChange(next);
        }}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        autoFocus={autoFocus}
        autoComplete="one-time-code"
        className="h-px w-px opacity-0"
      />
    </div>
  );
}

function PinSlots({
  label,
  value,
  length,
}: {
  label: string;
  value: string;
  length: PinLength;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {value.length}/{length}
        </span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
        {Array.from({ length }).map((_, index) => {
          const filled = index < value.length;
          const active = index === value.length;
          return (
            <div
              key={index}
              className={[
                "flex h-13 items-center justify-center rounded-xl border bg-input shadow-inner transition-all",
                active ? "border-primary ring-2 ring-primary/25" : "border-border",
              ].join(" ")}
            >
              {filled ? (
                <span className="text-2xl font-semibold leading-none text-foreground">*</span>
              ) : (
                <span className="block size-2 rounded-full bg-muted-foreground/20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
