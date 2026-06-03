"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, ArrowRight } from "lucide-react";

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 md:px-6 lg:px-8">
      <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      <div className="absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/70 md:p-9">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-700">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Unauthorized Access
          </h1>

          <p className="mt-3 text-center text-sm leading-6 text-slate-600 md:text-base">
            You must sign in as an admin to access this page.
          </p>

          <p className="mt-2 break-all text-center text-xs text-slate-400">
            Attempted route: {nextPath}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
            >
              Sign In as Admin
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
