"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  MoreVertical,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { deleteStudent, fetchStudents } from "@/lib/api";

const students = [
  {
    name: "Julianna Smith",
    id: "#ST-2041",
    grade: "12th Grade",
    section: "B",
    attendance: 98,
    absences: 1,
    status: "Excellent",
    tone: "excellent",
    avatar: "JS",
  },
  {
    name: "Marcus Rodriguez",
    id: "#ST-2052",
    grade: "11th Grade",
    section: "A",
    attendance: 91,
    absences: 3,
    status: "Good",
    tone: "good",
    avatar: "MR",
  },
  {
    name: "Sophia Chen",
    id: "#ST-2118",
    grade: "12th Grade",
    section: "B",
    attendance: 74,
    absences: 9,
    status: "Warning",
    tone: "warning",
    avatar: "SC",
  },
  {
    name: "Ethan Brooks",
    id: "#ST-2029",
    grade: "10th Grade",
    section: "C",
    attendance: 96,
    absences: 2,
    status: "Excellent",
    tone: "excellent",
    avatar: "EB",
  },
  {
    name: "Amina Hassan",
    id: "#ST-2098",
    grade: "9th Grade",
    section: "A",
    attendance: 88,
    absences: 5,
    status: "Good",
    tone: "good",
    avatar: "AH",
  },
  {
    name: "Noah Mensah",
    id: "#ST-2134",
    grade: "11th Grade",
    section: "C",
    attendance: 69,
    absences: 11,
    status: "At Risk",
    tone: "risk",
    avatar: "NM",
  },
];

const stats = [
  {
    label: "Total Students",
    value: "1,284",
    delta: "+24 this month",
    icon: Users,
    tone: "slate",
  },
  {
    label: "Active Enrollment",
    value: "1,196",
    delta: "93.2% enrolled",
    icon: UserCheck,
    tone: "emerald",
  },
  {
    label: "Attendance Alerts",
    value: "38",
    delta: "Needs review",
    icon: UserX,
    tone: "amber",
  },
  {
    label: "Average Attendance",
    value: "94.1%",
    delta: "+1.8% vs last term",
    icon: TrendingUp,
    tone: "sky",
  },
];

const activity = [
  { name: "Julianna Smith", action: "Updated guardian contact", time: "10 min ago" },
  { name: "Sophia Chen", action: "Attendance warning generated", time: "24 min ago" },
  { name: "Amina Hassan", action: "Transferred to Section A", time: "1 hour ago" },
  { name: "Noah Mensah", action: "Absence threshold reached", time: "2 hours ago" },
];

const levelDistribution = [
  { label: "Level 12", value: 312, total: 348 },
  { label: "Level 11", value: 289, total: 320 },
  { label: "Level 10", value: 254, total: 270 },
  { label: "Level 9", value: 215, total: 246 },
];

const toneStyles = {
  excellent: "bg-emerald-100 text-emerald-700",
  good: "bg-sky-100 text-sky-700",
  warning: "bg-amber-100 text-amber-700",
  risk: "bg-rose-100 text-rose-700",
};

const toneDots = {
  excellent: "bg-emerald-500",
  good: "bg-sky-500",
  warning: "bg-amber-500",
  risk: "bg-rose-500",
};

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function studentSlug(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export default function StudentsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All Students");
  const [backendStudents, setBackendStudents] = useState([]);
  const [openActionId, setOpenActionId] = useState("");
  const [deletingStudentId, setDeletingStudentId] = useState("");
  const [actionError, setActionError] = useState("");

  const loadStudents = async () => {
    try {
      const response = await fetchStudents();
      setBackendStudents(Array.isArray(response?.data) ? response.data : []);
      setActionError("");
    } catch {
      setBackendStudents([]);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleRemoveStudent = async (studentId) => {
    if (!studentId) {
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to remove this student?");
    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingStudentId(studentId);
      setActionError("");
      await deleteStudent(studentId);
      await loadStudents();
      setOpenActionId("");
    } catch (error) {
      setActionError(error.message || "Unable to remove student.");
    } finally {
      setDeletingStudentId("");
    }
  };

  const studentRows = useMemo(() => {
    return backendStudents.map((student) => {
      const name = student.fullName || "Unknown Student";
      const studentId = student.studentId || "N/A";
      const level = student.level || student.grade || "N/A";

      return {
        routeId: studentId,
        name,
        id: `#${studentId}`,
        level,
        section: "-",
        attendance: 0,
        absences: 0,
        status: "Good",
        tone: "good",
        avatar: initials(name),
      };
    });
  }, [backendStudents]);

  const filteredStudents = useMemo(() => {
    return studentRows.filter((student) => {
      const matchesQuery =
        !query ||
        student.name.toLowerCase().includes(query.toLowerCase()) ||
        student.id.toLowerCase().includes(query.toLowerCase()) ||
        student.level.toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        filter === "All Students" || student.status.toLowerCase() === filter.toLowerCase();
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, studentRows]);

  const activityWithRoute = useMemo(() => {
    return activity.map((item) => {
      const matchedStudent = studentRows.find(
        (student) => student.name.toLowerCase() === item.name.toLowerCase()
      );

      return {
        ...item,
        routeId: matchedStudent?.routeId || studentSlug(item.name),
      };
    });
  }, [studentRows]);

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Student Management
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Students
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track attendance, enrollment, and student performance in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Export List
            </button>
            <Link href="/register-student" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-sky-700 bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600">
              <UserRound className="h-4 w-4" />
              Add Student
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((card) => {
            const Icon = card.icon;
            const accentClass =
              card.tone === "emerald"
                ? "border-emerald-200"
                : card.tone === "amber"
                  ? "border-amber-200"
                  : card.tone === "sky"
                    ? "border-sky-200"
                    : "border-slate-200";
            const iconClass =
              card.tone === "emerald"
                ? "text-emerald-600 bg-emerald-50"
                : card.tone === "amber"
                  ? "text-amber-600 bg-amber-50"
                  : card.tone === "sky"
                    ? "text-sky-600 bg-sky-50"
                    : "text-slate-600 bg-slate-100";

            return (
              <div key={card.label} className={`rounded-2xl border bg-white p-5 shadow-xs ${accentClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{card.delta}</p>
                  </div>
                  <div className={`rounded-xl p-2 ${iconClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-3 md:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Student Roster</h2>
                <p className="text-xs text-slate-400">Search and filter enrolled students</p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                Updated today
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr_auto]">
              <div className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search student name, ID, or level"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>

              <button className="flex cursor-pointer h-11 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  {filter}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              <button className="flex cursor-pointer h-11 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  Sections
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              <button
                onClick={() => setFilter((current) => (current === "All Students" ? "Excellent" : "All Students"))}
                className="h-11 cursor-pointer rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                Apply
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              {actionError ? (
                <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{actionError}</div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-215">
                  <thead>
                    <tr className="bg-sky-700 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Level</th>
                      <th className="px-4 py-3">Attendance</th>
                      <th className="px-4 py-3">Absences</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                      {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b border-dashed border-sky-100 text-sm last:border-b-0">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-slate-200 to-slate-400 text-xs font-semibold text-slate-700">
                              {student.avatar}
                            </div>
                            <div>
                              <Link href={`/students/${student.routeId || studentSlug(student.name)}`} className="font-medium text-slate-800 transition hover:text-sky-700">
                                {student.name}
                              </Link>
                              <p className="text-xs text-slate-400">{student.level}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-500">{student.id}</td>
                        <td className="px-4 py-4 text-slate-600">{student.level}</td>
                        <td className="px-4 py-4 text-slate-700">{student.attendance}%</td>
                        <td className="px-4 py-4 text-slate-700">{student.absences}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${toneStyles[student.tone]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${toneDots[student.tone]}`} />
                            {student.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionId((current) =>
                                  current === student.routeId ? "" : student.routeId
                                )
                              }
                              className="grid h-7 w-7 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openActionId === student.routeId ? (
                              <div className="absolute right-0 z-10 mt-1 w-28 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <Link
                                  href={`/students/${student.routeId || studentSlug(student.name)}?edit=true`}
                                  onClick={() => setOpenActionId("")}
                                  className="block px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudent(student.routeId)}
                                  disabled={deletingStudentId === student.routeId}
                                  className="block w-full px-3 py-1.5 text-left text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                                >
                                  {deletingStudentId === student.routeId ? "Removing..." : "Remove"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
                <span>Showing 1 to {filteredStudents.length} of {studentRows.length} students</span>
                <div className="flex items-center gap-2">
                  <button className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-slate-500">Prev</button>
                  <button className="cursor-pointer rounded-full bg-slate-800 px-3 py-1.5 font-semibold text-white">1</button>
                  <button className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-slate-700">2</button>
                  <button className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-slate-700">3</button>
                  <span className="px-1 text-slate-400">...</span>
                  <button className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-slate-700">25</button>
                  <button className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-slate-500">Next</button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Level Distribution</h2>
                  <p className="text-xs text-slate-400">Enrollment across classes</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  Current term
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {levelDistribution.map((item) => {
                  const pct = Math.round((item.value / item.total) * 100);
                  return (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">{item.label}</span>
                        <span className="text-xs tabular-nums text-slate-400">{item.value} / {item.total}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
                  <p className="text-xs text-slate-400">Latest student updates</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {activityWithRoute.map((item) => (
                  <div key={`${item.name}-${item.action}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/students/${item.routeId}`} className="text-sm font-medium text-slate-800 transition hover:text-sky-700">
                          {item.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">{item.action}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}