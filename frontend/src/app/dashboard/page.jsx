"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, Plus, ShieldCheck, TrendingDown, TrendingUp, Users } from "lucide-react";
import { fetchDailyAttendance, fetchStudents } from "@/lib/api";

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toSortableMinutes(timeValue) {
  if (!timeValue || typeof timeValue !== "string") {
    return -1;
  }

  const [hours, minutes] = timeValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return -1;
  }

  return hours * 60 + minutes;
}

export default function DashboardPage() {
  const [students, setStudents] = useState([]);
  const [report, setReport] = useState({
    summary: { onTime: 0, absent: 0, late: 0 },
    rows: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const dateKey = new Date().toISOString().slice(0, 10);

      try {
        const [studentsResponse, reportResponse] = await Promise.all([
          fetchStudents(),
          fetchDailyAttendance(dateKey),
        ]);

        setStudents(Array.isArray(studentsResponse?.data) ? studentsResponse.data : []);
        setReport(
          reportResponse?.data || {
            summary: { onTime: 0, absent: 0, late: 0 },
            rows: [],
          }
        );
      } catch (loadError) {
        setError(loadError.message || "Unable to load dashboard data.");
      }
    };

    load();
  }, []);

  const totalStudents = students.length;
  const onTime = report.summary?.onTime || 0;
  const absent = report.summary?.absent || 0;
  const late = report.summary?.late || 0;

  const onTimeRate = totalStudents > 0 ? Math.round((onTime / totalStudents) * 100) : 0;
  const absentRate = totalStudents > 0 ? Math.round((absent / totalStudents) * 100) : 0;
  const lateRate = totalStudents > 0 ? Math.round((late / totalStudents) * 100) : 0;

  const stats = [
    {
      label: "Total Students",
      value: String(totalStudents),
      sub: "Registered in school",
      icon: Users,
      accent: "text-slate-700",
      iconBg: "bg-slate-100",
      pct: null,
      barColor: "",
      borderColor: "border-slate-200",
    },
    {
      label: "On-time Today",
      value: String(onTime),
      sub: `${onTimeRate}% attendance rate`,
      icon: TrendingUp,
      accent: "text-emerald-700",
      iconBg: "bg-emerald-50",
      pct: onTimeRate,
      barColor: "bg-emerald-500",
      borderColor: "border-emerald-200",
    },
    {
      label: "Late Arrivals",
      value: String(late),
      sub: `${lateRate}% late rate`,
      icon: Clock,
      accent: "text-amber-700",
      iconBg: "bg-amber-50",
      pct: lateRate,
      barColor: "bg-amber-400",
      borderColor: "border-amber-200",
    },
    {
      label: "Absent Today",
      value: String(absent),
      sub: `${absentRate}% absence rate`,
      icon: TrendingDown,
      accent: "text-red-600",
      iconBg: "bg-red-50",
      pct: absentRate,
      barColor: "bg-red-500",
      borderColor: "border-red-200",
    },
  ];

  const recentActivity = useMemo(() => {
    return (report.rows || [])
      .filter((row) => Boolean(row.checkInTime))
      .sort((a, b) => toSortableMinutes(b.checkInTime) - toSortableMinutes(a.checkInTime))
      .slice(0, 8)
      .map((row) => ({
        student: row.studentName,
        routeId: row.studentId,
        profileImage: row.profileImage || "",
        level: row.level || row.grade || "N/A",
        time: row.checkInTime,
        status: (row.status || "On-time").toLowerCase(),
      }));
  }, [report.rows]);

  const statusStyles = {
    "on-time": "text-emerald-700 bg-emerald-50",
    late: "text-amber-700 bg-amber-50",
    absent: "text-red-600 bg-red-50",
  };

  return (
    <div className="min-h-full p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Overview</h1>
          <p className="mt-0.5 text-sm text-slate-400">{todayLabel()}</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 shadow-xs">
          <Clock className="h-4 w-4 text-slate-400" />
          <span>
            Attendance window closes at <span className="font-medium text-slate-800">5:00 PM</span>
          </span>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border bg-white p-5 shadow-xs ${s.borderColor}`}>
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <div className={`rounded-lg p-1.5 ${s.iconBg}`}>
                <s.icon className={`h-4 w-4 ${s.accent}`} />
              </div>
            </div>
            <p className={`mt-3 text-2xl font-semibold tracking-tight ${s.accent}`}>{s.value}</p>
            {s.pct !== null ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${s.barColor}`} style={{ width: `${s.pct}%` }} />
                </div>
                <span className="w-8 text-right text-xs tabular-nums text-slate-500">{s.pct}%</span>
              </div>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Attendance Breakdown</h2>
              <p className="text-xs text-slate-400">School-level daily distribution</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Today</span>
          </div>

          <div className="mt-5 space-y-4">
            {[
              { label: "On-time", value: onTime, color: "bg-emerald-500" },
              { label: "Late", value: late, color: "bg-amber-400" },
              { label: "Absent", value: absent, color: "bg-rose-500" },
            ].map((item) => {
              const pct = totalStudents > 0 ? Math.round((item.value / totalStudents) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">{item.label}</span>
                    <span className="text-xs tabular-nums text-slate-400">
                      {item.value} / {totalStudents}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs tabular-nums text-slate-500">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FIXED: Replaced "Daily Status" with the Interactive Quick Action & Registration Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Quick Actions</h2>
            <p className="text-xs text-slate-400">Administrative entry points</p>
          </div>

          <div className="mt-4 space-y-3 flex-1 flex flex-col justify-center">
            <Link
              href="/students"
              className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-left transition hover:bg-slate-100/70 group"
            >
              <div>
                <p className="text-xs font-semibold text-slate-800">Register New Student</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Provision profile datasets and setup face assets</p>
              </div>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-transparent transition">
                <Plus className="h-4 w-4" />
              </span>
            </Link>

            <Link
              href="/students"
              className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-left transition hover:bg-slate-100/70 group"
            >
              <div>
                <p className="text-xs font-semibold text-slate-800">System Parameters Override</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Manually record status exceptions or lock check-ins</p>
              </div>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs group-hover:bg-amber-600 group-hover:text-white group-hover:border-transparent transition">
                <Clock className="h-4 w-4" />
              </span>
            </Link>

            <div className="flex items-center gap-2 mt-2 rounded-xl bg-sky-50/40 border border-sky-100 px-3 py-2.5 text-[11px] text-sky-800">
              <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0" />
              <span>Admin secure checkpoint validation strategy is fully active.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Recent Check-ins</h2>
            <p className="text-xs text-slate-400">Last recorded attendance events</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Level</th>
                <th className="px-6 py-3">Check-in</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity.map((row, index) => (
                <tr key={`${row.routeId || row.student}-${index}`} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3 font-medium text-slate-800">
                    <div className="flex items-center gap-3">
                      {row.profileImage ? (
                        <img
                          src={row.profileImage}
                          alt={`${row.student} profile`}
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                        />
                      ) : (
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-slate-200 to-slate-400 text-xs font-semibold text-slate-700">
                          {row.student
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                      <Link href={`/students/${row.routeId}`} className="transition hover:text-sky-700">
                        {row.student}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{row.level}</td>
                  <td className="px-6 py-3 tabular-nums text-slate-400">{row.time}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusStyles[row.status] || statusStyles.absent}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
          <span>Showing {recentActivity.length} of {report.rows?.length || 0} records</span>
        </div>
      </div>
    </div>
  );
}