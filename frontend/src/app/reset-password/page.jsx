"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { Toaster, toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestAdminPasswordOtp, resetAdminPasswordWithOtp } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const paramEmail = searchParams.get("email") || "";
    if (paramEmail) {
      setEmail(paramEmail);
    }
  }, [searchParams]);

  async function handleRequestOtp() {
    if (!email) {
      toast.error("Enter your admin email first");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await requestAdminPasswordOtp({ email });
      toast.success(response?.message || "OTP sent");
    } catch (error) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    if (!email || !otp || !newPassword || !confirmPassword) {
      toast.error("Fill all fields");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      toast.error("OTP must be 6 digits");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setResetLoading(true);
    try {
      const response = await resetAdminPasswordWithOtp({ email, otp, newPassword });
      toast.success(response?.message || "Password reset successful");
      router.push("/login");
    } catch (error) {
      toast.error(error.message || "Password reset failed");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 p-4 md:p-6 lg:p-8">
      <Toaster richColors position="top-right" />

      <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-3rem)] max-w-xl items-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 md:p-8">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>

          <div className="mt-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100">
              <KeyRound className="h-5 w-5 text-sky-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reset password</h1>
              <p className="text-sm text-slate-500">Use OTP verification to set a new admin password.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Request OTP first, then complete reset below.
          </div>

          <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admin email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 px-4 text-slate-800 placeholder:text-slate-400 focus:bg-white"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={otpLoading}
                onClick={handleRequestOtp}
                className="h-9 rounded-lg bg-slate-800 px-3 text-xs text-white hover:bg-slate-700"
              >
                {otpLoading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">OTP code</Label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 px-4 text-slate-800 placeholder:text-slate-400 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">New password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 px-4 text-slate-800 placeholder:text-slate-400 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Confirm password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 px-4 text-slate-800 placeholder:text-slate-400 focus:bg-white"
              />
            </div>

            <Button
              type="submit"
              disabled={resetLoading}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-sky-700 text-white transition hover:bg-sky-600 disabled:opacity-60"
            >
              {resetLoading ? "Resetting password..." : "Reset password"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
