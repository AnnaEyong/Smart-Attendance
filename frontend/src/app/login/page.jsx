"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ScanFace,
  Eye,
  EyeOff,
  CircleCheck,
  LifeBuoy,
  Clock3,
  Users,
  ChevronRight,
  ShieldCheck,
  Building2,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Toaster, toast } from "sonner";
import { loginAdmin, resendAdminLoginOtp, setAdminToken, verifyAdminLoginOtp } from "@/lib/api";

const DEFAULT_LOGIN_OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldownMs, setResendCooldownMs] = useState(0);
  const [loginStep, setLoginStep] = useState("credentials");

  useEffect(() => {
    if (loginStep !== "otp" || resendCooldownMs <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendCooldownMs((current) => {
        if (current <= 1000) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1000;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loginStep, resendCooldownMs]);

  async function handleLogin(event) {
    event.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await loginAdmin({ email, password });
      setOtpEmail(response?.data?.email || email);
      setOtp("");
      setResendCooldownMs(Number(response?.data?.resendAfterMs || DEFAULT_LOGIN_OTP_RESEND_COOLDOWN_MS));
      setLoginStep("otp");
      toast.success(response?.message || "OTP sent");
    } catch (error) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!otpEmail) {
      toast.error("No login email found. Please sign in again.");
      return;
    }

    if (resendCooldownMs > 0) {
      return;
    }

    setResendLoading(true);
    try {
      const response = await resendAdminLoginOtp({ email: otpEmail });
      setResendCooldownMs(Number(response?.data?.resendAfterMs || DEFAULT_LOGIN_OTP_RESEND_COOLDOWN_MS));
      toast.success(response?.message || "A new OTP has been sent");
    } catch (error) {
      toast.error(error.message || "Unable to resend OTP");
    } finally {
      setResendLoading(false);
    }
  }

  const cooldownSeconds = Math.ceil(resendCooldownMs / 1000);

  async function handleVerifyLoginOtp(event) {
    event.preventDefault();

    if (!otpEmail || !/^\d{6}$/.test(otp)) {
      toast.error("Enter a valid 6-digit OTP");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await verifyAdminLoginOtp({ email: otpEmail, otp });
      setAdminToken(response?.data?.token || "");
      toast.success(response?.message || "Login successful");
      const nextPath = searchParams.get("next");
      router.push(nextPath || "/dashboard");
    } catch (error) {
      toast.error(error.message || "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-slate-100 p-3 md:p-4 lg:p-5">
      <Toaster richColors position="top-right" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-35 bg-[linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] bg-size-[72px_72px] mask-[linear-gradient(to_bottom,rgba(0,0,0,0.5),transparent_96%)]"
      />

      <div className="relative z-10 mx-auto flex h-full max-w-lg items-center">
        <section className="flex w-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-sky-200 bg-white p-5 shadow-[0_28px_70px_rgba(15,23,42,0.18)] backdrop-blur-sm md:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Building2 className="h-3.5 w-3.5 text-sky-700" />
                Smart Attendance
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Admin Sign In</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to manage students, attendance, and reports.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-500">
              <ShieldCheck className="h-5 w-5 text-sky-700" />
            </div>
          </div>

          <form
            onSubmit={loginStep === "credentials" ? handleLogin : handleVerifyLoginOtp}
            noValidate
            className="mt-4 flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden"
          >
            {loginStep === "credentials" ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter admin email"
                    required
                    className="h-11 rounded-xl border-slate-200 bg-white px-4 text-slate-800 placeholder:text-slate-400 focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="h-11 rounded-xl border-slate-200 bg-white px-4 pr-12 text-slate-800 placeholder:text-slate-400 focus:bg-white"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2 text-slate-600">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-700" />
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={() => router.push(`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`)}
                    className="font-medium text-sky-700 transition hover:text-sky-800"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 text-white transition hover:bg-sky-600 disabled:opacity-60"
                >
                  {loading ? "Sending OTP..." : "Continue"}
                  {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  Verification code sent to {otpEmail}.
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">OTP code</Label>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    inputMode="numeric"
                    className="h-11 rounded-xl border-slate-200 bg-white px-4 text-slate-800 placeholder:text-slate-400 focus:bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={otpLoading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 text-white transition hover:bg-sky-600 disabled:opacity-60"
                >
                  {otpLoading ? "Verifying OTP..." : "Verify and sign in"}
                  {!otpLoading ? <ArrowRight className="h-4 w-4" /> : null}
                </Button>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span>
                    {cooldownSeconds > 0 ? `Resend available in ${cooldownSeconds}s` : "Didn't get code?"}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading || cooldownSeconds > 0}
                    className="font-semibold text-sky-700 transition hover:text-sky-800 disabled:text-slate-400"
                  >
                    {resendLoading ? "Sending..." : "Resend OTP"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLoginStep("credentials");
                    setOtp("");
                    setResendCooldownMs(0);
                  }}
                  className="w-full text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  Back to email and password
                </button>
              </>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <LifeBuoy className="mt-0.5 h-4 w-4 text-sky-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Need help signing in?</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Contact the school IT desk or request account access from the admin team.
                  </p>
                </div>
              </div>
            </div>
          </form>

          <div className="mt-4 text-xs text-slate-400">
            OTP sign-in is required for all admin sessions.
          </div>
        </section>
      </div>
    </div>
  );
}