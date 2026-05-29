"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  MoreVertical,
  ShieldCheck,
  Timer,
  TrendingUp,
} from "lucide-react";
import { fetchDailyAttendance, fetchDepartments, fetchStudents } from "@/lib/api";

const summaryCards = (summary, registeredTotal, reportTotal) => {
  const attendanceRate = registeredTotal > 0 ? ((summary.present / registeredTotal) * 100).toFixed(1) : "0.0";
  const absentRate = registeredTotal > 0 ? ((summary.absent / registeredTotal) * 100).toFixed(1) : "0.0";

  return [
    {
      label: "Overall Attendance",
      value: `${attendanceRate}%`,
      change: `${summary.present} present`,
      note: "Students who checked in today",
      accent: "emerald",
      Icon: TrendingUp,
    },
    {
      label: "Absent Students",
      value: `${absentRate}%`,
      change: `${summary.absent} absent`,
      note: "Students who did not mark attendance",
      accent: "rose",
      Icon: Timer,
    },
    {
      label: "Daily Total",
      value: `${reportTotal}`,
      change: "Live",
      note: "Students in today report",
      accent: "slate",
      Icon: ShieldCheck,
    },
  ];
};

const toneStyles = {
  present: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
  absent: "bg-rose-100 text-rose-700",
};

const statusDotStyles = {
  Present: "bg-emerald-500",
  Late: "bg-amber-500",
  Absent: "bg-rose-500",
};

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey(new Date()));
  const [status, setStatus] = useState("All Status");
  const [level, setLevel] = useState("All Levels");
  const [department, setDepartment] = useState("All Departments");
  const [draftStatus, setDraftStatus] = useState("All Status");
  const [draftLevel, setDraftLevel] = useState("All Levels");
  const [draftDepartment, setDraftDepartment] = useState("All Departments");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0 });
  const [registeredTotal, setRegisteredTotal] = useState(0);
  const [allDepartments, setAllDepartments] = useState([]);

  useEffect(() => {
    const loadReport = async () => {
      const dateKey = selectedDate;
      try {
        const [attendanceResponse, studentsResponse, departmentsResponse] = await Promise.all([
          fetchDailyAttendance(dateKey),
          fetchStudents(),
          fetchDepartments(),
        ]);
        const registeredStudents = Array.isArray(studentsResponse?.data) ? studentsResponse.data : [];
        const departments = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];
        setAllDepartments(departments);
        const totalRegistered = registeredStudents.length;
        setRegisteredTotal(totalRegistered);
        const backendRows = Array.isArray(attendanceResponse?.data?.rows) ? attendanceResponse.data.rows : [];
        const attendedRows = backendRows.filter((row) => Boolean(row.checkInTime));

        const attendedSummary = attendedRows.reduce(
          (acc, row) => {
            acc.present += 1;

            if (row.isLate) {
              acc.late += 1;
            }

            return acc;
          },
          { present: 0, absent: 0, late: 0 },
        );
        attendedSummary.absent = Math.max(0, totalRegistered - attendedSummary.present);

        setRows(
          attendedRows.map((row) => ({
            name: row.studentName,
            routeId: row.studentId,
            profileImage: row.profileImage || "",
            id: `#${row.studentId}`,
            level: row.level || row.grade || "N/A",
            department: row.department || "N/A",
            checkIn: row.checkInTime || "--:--",
            checkOut: row.checkOutTime || "--:--",
            status: row.status,
            tone: row.status.toLowerCase(),
            avatarClass:
              row.status === "Present"
                ? "from-emerald-200 to-emerald-400"
                : row.status === "Late"
                  ? "from-amber-200 to-amber-400"
                  : "from-sky-200 to-sky-400",
          }))
        );
        setSummary(attendedSummary);
      } catch {
        setRows([]);
        setSummary({ present: 0, absent: 0, late: 0 });
        setRegisteredTotal(0);
        setAllDepartments([]);
      }
    };

    loadReport();
  }, [selectedDate]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesStatus =
        status === "All Status" ? true : row.status.toLowerCase() === status.toLowerCase();
      const matchesLevel =
        level === "All Levels" ? true : row.level.toLowerCase() === level.toLowerCase();
      const matchesDepartment =
        department === "All Departments" ? true : row.department.toLowerCase() === department.toLowerCase();

      return matchesStatus && matchesLevel && matchesDepartment;
    });
  }, [department, level, status, rows]);

  const levelOptions = useMemo(() => {
    return ["All Levels", ...new Set(rows.map((row) => row.level).filter(Boolean))];
  }, [rows]);

  const departmentOptions = useMemo(() => {
    const names = allDepartments
      .map((department) => department?.name)
      .filter((name) => typeof name === "string" && name.trim().length > 0);
    return ["All Departments", ...new Set(names)];
  }, [allDepartments]);

  const cards = useMemo(() => summaryCards(summary, registeredTotal, rows.length), [summary, registeredTotal, rows.length]);

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Attendance Reports</h1>
            <p className="mt-1 text-sm text-slate-500">
              Generate detailed insights and monitor school check-in and check-out records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50">
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
            <button className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-sky-800 bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600">
              <FileText className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs md:p-4">
          <div className="grid gap-3 xl:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Date Range</label>
              <div className="flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value || toLocalDateKey(new Date()))}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Level</label>
              <select
                value={draftLevel}
                onChange={(event) => setDraftLevel(event.target.value)}
                className="flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              >
                {levelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Department</label>
              <select
                value={draftDepartment}
                onChange={(event) => setDraftDepartment(event.target.value)}
                className="flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              >
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Status</label>
              <select
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value)}
                className="flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              >
                {Object.keys(statusDotStyles).length > 0 ? null : null}
                {[
                  "All Status",
                  "Present",
                  "Late",
                ].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Filter</label>
              <button
                type="button"
                onClick={() => {
                  setStatus(draftStatus);
                  setLevel(draftLevel);
                  setDepartment(draftDepartment);
                }}
                className="h-11 rounded-lg cursor-pointer bg-amber-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-230">
              <thead>
                <tr className="bg-sky-700 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Check-In</th>
                  <th className="px-4 py-3">Check-Out</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-dashed border-sky-100 text-sm last:border-b-0">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {row.profileImage ? (
                          <img
                            src={row.profileImage}
                            alt={`${row.name} profile`}
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                          />
                        ) : (
                          <div
                            className={`grid h-9 w-9 place-items-center rounded-full bg-linear-to-br text-xs font-semibold text-slate-700 ${row.avatarClass}`}
                          >
                            {initials(row.name)}
                          </div>
                        )}
                        <Link href={`/students/${row.routeId}`} className="font-medium text-slate-800 transition hover:text-sky-700">
                          {row.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{row.id}</td>
                    <td className="px-4 py-4 text-slate-600">{row.level}</td>
                    <td className="px-4 py-4 text-slate-700">{row.checkIn}</td>
                    <td className="px-4 py-4 text-slate-700">{row.checkOut}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${toneStyles[row.tone]}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.tone === "present"
                              ? "bg-emerald-500"
                              : row.tone === "late"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                        />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button className="grid cursor-pointer h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>Showing 1 to {filteredRows.length} of {rows.length} students</span>
            <div className="flex items-center gap-2 text-sm">
              <button className="grid cursor-pointer h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-400">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="grid cursor-pointer h-7 w-7 place-items-center rounded-md bg-slate-800 font-semibold text-white">
                1
              </button>
              <button className="grid cursor-pointer h-7 w-7 place-items-center rounded-md text-slate-700">2</button>
              <button className="grid cursor-pointer h-7 w-7 place-items-center rounded-md text-slate-700">3</button>
              <span className="px-1 text-slate-400">...</span>
              <button className="grid cursor-pointer h-7 w-7 place-items-center rounded-md text-slate-700">25</button>
              <button className="grid cursor-pointer h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-500">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.Icon;
            const borderTone =
              card.accent === "emerald"
                ? "border-l-4 border-l-emerald-500"
                : card.accent === "amber"
                  ? "border-l-4 border-l-amber-500"
                  : card.accent === "rose"
                    ? "border-l-4 border-l-rose-500"
                  : "border-l-4 border-l-slate-700";

            const changeTone =
              card.accent === "emerald"
                ? "text-emerald-600"
                : card.accent === "amber"
                  ? "text-rose-500"
                  : card.accent === "rose"
                    ? "text-rose-600"
                  : "text-emerald-600";

            const iconTone =
              card.accent === "emerald"
                ? "text-emerald-600"
                : card.accent === "amber"
                  ? "text-amber-500"
                  : card.accent === "rose"
                    ? "text-rose-500"
                  : "text-slate-700";

            return (
              <div key={card.label} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-xs ${borderTone}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {card.label}
                    </p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-3xl leading-none font-semibold tracking-tight text-slate-900">
                        {card.value}
                      </span>
                      <span className={`mb-1 text-sm font-semibold ${changeTone}`}>{card.change}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{card.note}</p>
                  </div>
                  <Icon className={`h-4 w-4 ${iconTone}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}