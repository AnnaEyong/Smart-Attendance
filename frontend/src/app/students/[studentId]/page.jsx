"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  Download,
  Pencil,
  Mail,
  Phone,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { fetchDailyAttendance, fetchStudentById, updateStudent } from "@/lib/api";

const dayStyles = {
  present: "bg-emerald-100 text-emerald-900",
  absent: "bg-rose-100 text-rose-900",
  late: "bg-amber-100 text-amber-900",
  neutral: "bg-slate-100 text-slate-400",
};

const statusTextStyles = {
  present: "text-emerald-600",
  absent: "text-rose-600",
  late: "text-amber-600",
  neutral: "text-slate-600",
};

const statusBadgeStyles = {
  present: "bg-emerald-100 text-emerald-700",
  absent: "bg-rose-100 text-rose-700",
  late: "bg-amber-100 text-amber-700",
  neutral: "bg-slate-100 text-slate-700",
};

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthMap(monthRows, daysInMonth, today) {
  const map = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (day > today) {
      map[day] = "neutral";
      continue;
    }

    const row = monthRows[day];
    map[day] = (row?.status || "Absent").toLowerCase();
  }

  return map;
}

function buildMonthDateKeys(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const monthIndex = baseDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, monthIndex, day);
    const dateKey = toLocalDateKey(date);

    return {
      day,
      dateKey,
    };
  });
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = params?.studentId;
  const isEditMode = searchParams.get("edit") === "true";

  const [student, setStudent] = useState(null);
  const [todayRow, setTodayRow] = useState(null);
  const [monthRows, setMonthRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    level: "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    profileImage: "",
  });

  const buildProfileImage = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("Please choose a valid image file.");
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 320;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Unable to prepare profile picture."));
            return;
          }

          const sourceSize = Math.min(image.width, image.height);
          const offsetX = (image.width - sourceSize) / 2;
          const offsetY = (image.height - sourceSize) / 2;
          ctx.drawImage(image, offsetX, offsetY, sourceSize, sourceSize, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };

        image.onerror = () => reject(new Error("Unable to read selected image."));
        image.src = String(reader.result || "");
      };

      reader.onerror = () => reject(new Error("Unable to read selected image."));
      reader.readAsDataURL(file);
    });
  };

  const loadStudentDetail = async () => {
    if (!studentId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const dateKey = toLocalDateKey(new Date());
      const monthDates = buildMonthDateKeys(new Date());
      const [studentResponse, dailyResponse, ...monthlyResponses] = await Promise.all([
        fetchStudentById(studentId),
        fetchDailyAttendance(dateKey),
        ...monthDates.map(({ dateKey: monthlyDateKey }) => fetchDailyAttendance(monthlyDateKey)),
      ]);

      const loadedStudent = studentResponse?.data || null;
      const rows = Array.isArray(dailyResponse?.data?.rows) ? dailyResponse.data.rows : [];
      const row = rows.find((item) => item.studentId === studentId) || null;
      const nextMonthRows = monthDates.reduce((acc, { day }, index) => {
        const response = monthlyResponses[index];
        const dailyRows = Array.isArray(response?.data?.rows) ? response.data.rows : [];
        const matchedRow = dailyRows.find((item) => item.studentId === studentId) || null;

        acc[day] = matchedRow;
        return acc;
      }, {});

      setStudent(loadedStudent);
      setTodayRow(row);
      setMonthRows(nextMonthRows);

      const fullName = loadedStudent?.fullName || "";
      const [splitFirst = "", ...rest] = fullName.split(" ");
      const splitLast = rest.join(" ");

      setFormData({
        firstName: loadedStudent?.firstName || splitFirst,
        lastName: loadedStudent?.lastName || splitLast,
        email: loadedStudent?.email || "",
        phone: loadedStudent?.phone || "",
        level: loadedStudent?.level || "",
        guardianName: loadedStudent?.guardianName || "",
        guardianPhone: loadedStudent?.guardianPhone || "",
        guardianEmail: loadedStudent?.guardianEmail || "",
        profileImage: loadedStudent?.profileImage || "",
      });
    } catch (loadError) {
      setError(loadError.message || "Unable to load student details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentDetail();
  }, [studentId]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setSaving(true);
      setSaveSuccess("");
      setSaveError("");
      const profileImage = await buildProfileImage(file);
      await updateStudent(studentId, {
        profileImage,
      });
      await loadStudentDetail();
      setSaveSuccess("Profile picture updated successfully.");
    } catch (imageError) {
      setSaveError(imageError.message || "Unable to process profile picture.");
      setSaveSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "level",
      "guardianName",
      "guardianPhone",
      "guardianEmail",
    ];

    const missingField = requiredFields.find((field) => !String(formData[field] || "").trim());
    if (missingField) {
      setSaveError("Please fill all required fields before saving.");
      setSaveSuccess("");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSaveSuccess("");

      await updateStudent(studentId, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        level: formData.level.trim(),
        guardianName: formData.guardianName.trim(),
        guardianPhone: formData.guardianPhone.trim(),
        guardianEmail: formData.guardianEmail.trim(),
        profileImage: formData.profileImage,
      });

      await loadStudentDetail();
      setSaveSuccess("Student updated successfully.");
      router.push(`/students/${studentId}`);
    } catch (saveUpdateError) {
      setSaveError(saveUpdateError.message || "Unable to update student.");
      setSaveSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const attendanceMap = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return buildMonthMap(monthRows, daysInMonth, now.getDate());
  }, [monthRows]);

  const monthDays = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  }, []);

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-xs">
          Loading student details...
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-xs">
          {error || "Student not found."}
        </div>
      </div>
    );
  }

  const fullName = isEditMode
    ? `${formData.firstName || ""} ${formData.lastName || ""}`.trim() || student.fullName || "Unknown Student"
    : student.fullName || "Unknown Student";
  const avatar = initials(fullName);
  const status = todayRow?.status || "Absent";
  const normalizedStatus = String(status).toLowerCase();
  const profileImage = isEditMode ? formData.profileImage : student.profileImage;
  const guardianName = student.guardianName || "Not provided";
  const guardianPhone = student.guardianPhone || "Not provided";
  const guardianEmail = student.guardianEmail || "Not provided";

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/students" className="transition hover:text-sky-700">
              Students
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800">{fullName}</span>
            {isEditMode ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Edit Mode</span> : null}
          </div>

          <Link href="/students" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
            Back to roster
          </Link>
        </div>

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={`${fullName} profile`}
                      className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-linear-to-br from-slate-200 via-sky-100 to-slate-400 text-2xl font-semibold text-slate-700 ring-4 ring-white shadow-sm">
                      {avatar}
                    </div>
                  )}
                  <label className="absolute bottom-1 right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-sky-700 text-white ring-4 ring-white transition hover:bg-sky-600">
                    <Pencil className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                      disabled={saving}
                    />
                  </label>
                </div>

                <h1 className="mt-4 text-xl font-semibold text-slate-900">{fullName}</h1>
                <p className="mt-1 text-sm text-slate-500">Student ID: {student.studentId}</p>
                <p className="mt-4 text-xs text-slate-500">
                  {saving ? "Updating photo..." : "Use the edit icon on the photo to upload or replace the profile image."}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Level</p>
                  <p className="mt-1 text-base font-semibold text-slate-800">{student.level || student.grade || "N/A"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Today Status</p>
                  <p className={`mt-1 text-base font-semibold ${statusTextStyles[normalizedStatus] || statusTextStyles.neutral}`}>{status}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white py-3 px-6 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Student Info</p>

              <div className="mt-4 space-y-4">
                {isEditMode ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-slate-600">First Name</label>
                        <input
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Last Name</label>
                        <input
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Email</label>
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Mobile</label>
                      <input
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Level</label>
                      <select
                        name="level"
                        value={formData.level}
                        onChange={handleInputChange}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      >
                        <option value="">Select level</option>
                        <option value="Level 100">Level 100</option>
                        <option value="Level 200">Level 200</option>
                        <option value="Level 300">Level 300</option>
                        <option value="Level 400">Level 400</option>
                        <option value="Level 500">Level 500</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{fullName}</p>
                        <p className="text-sm text-slate-500">Student</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                        <Mail className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{student.email || "Not provided"}</p>
                        <p className="text-sm text-slate-500">Email</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                        <Phone className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{student.phone || "Not provided"}</p>
                        <p className="text-sm text-slate-500">Mobile</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white py-3 px-6 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Guardian Info</p>

              <div className="mt-4 space-y-4">
                {isEditMode ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Guardian Name</label>
                      <input
                        name="guardianName"
                        value={formData.guardianName}
                        onChange={handleInputChange}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Guardian Email</label>
                      <input
                        name="guardianEmail"
                        type="email"
                        value={formData.guardianEmail}
                        onChange={handleInputChange}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Guardian Phone</label>
                      <input
                        name="guardianPhone"
                        value={formData.guardianPhone}
                        onChange={handleInputChange}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{guardianName}</p>
                        <p className="text-sm text-slate-500">Guardian</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                        <Mail className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{guardianEmail}</p>
                        <p className="text-sm text-slate-500">Guardian Email</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                        <Phone className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{guardianPhone}</p>
                        <p className="text-sm text-slate-500">Guardian Phone</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <CalendarDays className="h-4 w-4 text-sky-700" />
                  Monthly Attendance Snapshot
                </div>
                <span className="text-sm font-semibold text-slate-700">{new Date().toLocaleString("en-GB", { month: "long", year: "numeric" })}</span>
              </div>

              <div className="mt-6 grid grid-cols-7 gap-2 text-center text-sm font-semibold text-slate-500">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {monthDays.map((day) => {
                  const statusKey = attendanceMap[day] || "neutral";
                  const tone = dayStyles[statusKey] || dayStyles.neutral;
                  return (
                    <div key={day} className={`flex h-13 flex-col items-center justify-center rounded-xl border border-transparent text-sm font-medium ${tone}`}>
                      <span>{day}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Present</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Late</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Absent</span>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-sky-700" />
                  Attendance Record Status
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeStyles[normalizedStatus] || statusBadgeStyles.neutral}`}>{status}</span>
              </div>

              <div className="mt-2 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-[100px_minmax(0,1fr)_180px]">
                <div className="grid h-24 w-full place-items-center rounded-xl bg-linear-to-br from-slate-700 via-sky-900 to-slate-950 text-lg font-semibold text-white">
                  {avatar}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Today Check-in</p>
                    <p className="font-semibold text-slate-900">{todayRow?.checkInTime || "--:--"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Today Check-out</p>
                    <p className="font-semibold text-slate-900">{todayRow?.checkOutTime || "--:--"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Student ID</p>
                    <p className="font-semibold text-slate-900">{student.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Record Date</p>
                    <p className="font-semibold text-slate-900">{todayRow?.date || toLocalDateKey(new Date())}</p>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-3">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <Link
                        href={`/students/${studentId}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Cancel Edit
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={loadStudentDetail}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Refresh
                      </button>
                      <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                        <Download className="h-4 w-4" />
                        Export Report
                      </button>
                    </>
                  )}
                </div>
              </div>

              {saveError ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{saveError}</div>
              ) : null}

              {saveSuccess ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{saveSuccess}</div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
