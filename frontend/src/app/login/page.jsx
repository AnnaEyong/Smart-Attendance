"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ScanFace,
  Eye,
  EyeOff,
  CircleCheck,
  LifeBuoy,
  Clock3,
  Timer,
  Users,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Building2,
  BadgeCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Toaster, toast } from "sonner";
import { loginAdmin, setAdminToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await loginAdmin({ email, password });
      setAdminToken(response?.data?.token || "");
      toast.success(response?.message || "Login successful");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 p-4 md:p-6 lg:p-8">
      <Toaster richColors position="top-right" />

      <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/40 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-6 lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <section className="flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-2xl shadow-slate-200/60 md:p-8 lg:min-h-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <Building2 className="h-5 w-5 text-sky-200" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Smart Attendance</p>
                <h1 className="text-lg font-semibold text-white">Admin Portal</h1>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold text-slate-100 backdrop-blur">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-300" />
              Secure Access
            </span>
          </div>

          <div className="mt-10 max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              School-wide attendance
            </p>

            <h2 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
              One clean dashboard for school check-in, check-out, and student tracking.
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 md:text-base">
              Use the same platform styling across all pages: calm slate surfaces, crisp cards, and clear admin workflows for attendance management.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Daily check-ins", value: "Realtime", icon: Clock3 },
                { label: "Attendance rule", value: "School-wide", icon: Users },
                { label: "Verification", value: "Facial scan", icon: ScanFace },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-300">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                    </div>
                    <item.icon className="h-4 w-4 text-sky-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Security
              </div>
              <p className="mt-2 text-sm text-slate-300">Admin logins are protected and tracked for audit-friendly access.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <BadgeCheck className="h-4 w-4 text-sky-200" />
                Attendance
              </div>
              <p className="mt-2 text-sm text-slate-300">Supports level-based student tracking across the whole school.</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 md:p-7 lg:min-h-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Admin Sign In</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to manage students, attendance, and reports.</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 text-slate-500">
              <ShieldCheck className="h-5 w-5 text-sky-700" />
            </div>
          </div>

          <div className="mt-5 grid gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-emerald-600" />
              <span>System online</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-sky-600" />
              <span>Sync active</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span>Admin only access</span>
            </div>
          </div>

          <form onSubmit={handleLogin} noValidate className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                required
                className="h-11 rounded-xl border-slate-200 bg-slate-50 px-4 text-slate-800 placeholder:text-slate-400 focus:bg-white"
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
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 px-4 pr-12 text-slate-800 placeholder:text-slate-400 focus:bg-white"
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

              <a href="#" className="font-medium text-sky-700 transition hover:text-sky-800">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 text-white transition hover:bg-sky-600 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href="#"
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span>Request account access</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </a>

            <a
              href="#"
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span>System status</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}