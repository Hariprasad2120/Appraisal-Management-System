"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "../actions";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("token", token);
    formData.set("password", password);
    formData.set("confirmPassword", confirmPassword);
    const res = await resetPasswordAction(formData);
    if (res.ok) setMessage(res.message);
    else setError(res.message);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-md">
      <h1 className="ds-h2">Reset password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {message && <p className="text-xs text-green-600">{message}</p>}
        <button type="submit" disabled={loading || !token} className="h-11 w-full rounded-xl bg-gradient-teal text-sm font-semibold text-white disabled:opacity-60">
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
      <Link href="/login" className="mt-4 block text-center text-xs text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
