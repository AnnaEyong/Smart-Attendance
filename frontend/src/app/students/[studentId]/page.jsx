"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  fetchDailyAttendance,
  fetchDepartments,
  fetchStudentById,
  fetchStudentMonthlyAttendance,
  markAttendanceExcused,
  updateAttendanceStatus,
  updateStudent,
} from "@/lib/api";
import StudentDetailSkeleton from "@/components/StudentDetailSkeleton";

const dayStyles = {
  "on-time": "bg-emerald-100 text-emerald-900",
  absent: "bg-rose-100 text-rose-900",
  late: "bg-amber-100 text-amber-900",
  excused: "bg-blue-100 text-blue-900",
  neutral: "bg-slate-100 text-slate-400",
};

const statusTextStyles = {
  "on-time": "text-emerald-600",
  absent: "text-rose-600",
  late: "text-amber-600",
  excused: "text-blue-600",
  neutral: "text-slate-600",
};

const statusBadgeStyles = {
  "on-time": "bg-emerald-100 text-emerald-700",
  absent: "bg-rose-100 text-rose-700",
  late: "bg-amber-100 text-amber-700",
  excused: "bg-blue-100 text-blue-700",
  neutral: "bg-slate-100 text-slate-700",
};

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWeekendDate(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function buildMonthMap(monthRowsByDate, selectedMonthDate, todayDateKey) {
  const year = selectedMonthDate.getFullYear();
  const monthIndex = selectedMonthDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const map = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    const currentDate = new Date(year, monthIndex, day);
    const dayDateKey = toLocalDateKey(currentDate);

    if (dayDateKey > todayDateKey) {
      map[day] = "neutral";
      continue;
    }

    const row = monthRowsByDate[dayDateKey];

    if (row?.status) {
      map[day] = String(row.status).toLowerCase();
      continue;
    }

    if (isWeekendDate(currentDate)) {
      map[day] = "neutral";
      continue;
    }

    map[day] = "absent";
  }

  return map;
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRelativeLastUpdated(timestamp) {
  if (!timestamp) {
    return "Last updated unavailable";
  }

  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Last updated unavailable";
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - parsedDate.getTime());
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) {
    return "Updated just now";
  }

  if (diffMs < hourMs) {
    const minutes = Math.floor(diffMs / minuteMs);
    return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(diffMs / dayMs);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
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
  const [departmentFacultyMap, setDepartmentFacultyMap] = useState({});
  const [selectedDateKey, setSelectedDateKey] = useState(() => toLocalDateKey(new Date()));
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [monthError, setMonthError] = useState("");
  const monthRequestRef = useRef(0);
  const monthCacheRef = useRef({});
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
    dob: "", 
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    profileImage: "",
  });

  // Excuse Modal State
  const [excuseModal, setExcuseModal] = useState(null);
  const [excuseReason, setExcuseReason] = useState("");

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

  const loadMonthSnapshot = async (monthDate, targetStudentId = studentId) => {
    if (!targetStudentId) {
      return;
    }

    const requestId = monthRequestRef.current + 1;
    monthRequestRef.current = requestId;

    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const cacheKey = `${targetStudentId}:${monthKey}`;
    const cachedRows = monthCacheRef.current[cacheKey];

    if (cachedRows) {
      setMonthRows(cachedRows);
    }

    setMonthError("");

    try {
      const monthlyResponse = await fetchStudentMonthlyAttendance(targetStudentId, monthKey);
      const monthlyRows = Array.isArray(monthlyResponse?.data?.rows) ? monthlyResponse.data.rows : [];

      const nextMonthRows = monthlyRows.reduce((acc, row) => {
        const key = String(row?.date || "").trim();
        if (!key) {
          return acc;
        }

        acc[key] = row;
        return acc;
      }, {});

      if (requestId !== monthRequestRef.current) {
        return;
      }

      monthCacheRef.current[cacheKey] = nextMonthRows;
      setMonthRows(nextMonthRows);
    } catch (snapshotError) {
      if (requestId !== monthRequestRef.current) {
        return;
      }

      if (!cachedRows) {
        setMonthRows({});
      }
      setMonthError(snapshotError.message || "Unable to load monthly attendance snapshot.");
    }
  };

  const loadStudentDetail = async () => {
    if (!studentId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const dateKey = toLocalDateKey(new Date());
      const [studentResponse, dailyResponse, departmentsResponse] = await Promise.all([
        fetchStudentById(studentId),
        fetchDailyAttendance(dateKey),
        fetchDepartments(),
      ]);

      const loadedStudent = studentResponse?.data || null;
      const rows = Array.isArray(dailyResponse?.data?.rows) ? dailyResponse.data.rows : [];
      const row = rows.find((item) => item.studentId === studentId) || null;

      setStudent(loadedStudent);
      setTodayRow(row);

      const departments = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];
      const facultyByDepartmentName = departments.reduce((acc, department) => {
        const departmentName = typeof department?.name === "string" ? department.name.trim() : "";
        if (!departmentName) {
          return acc;
        }

        const facultyName = typeof department?.facultyId?.name === "string"
          ? department.facultyId.name.trim()
          : "";

        acc[departmentName] = facultyName || "Not assigned";
        return acc;
      }, {});
      setDepartmentFacultyMap(facultyByDepartmentName);

      const fullName = loadedStudent?.fullName || "";
      const [splitFirst = "", ...rest] = fullName.split(" ");
      const splitLast = rest.join(" ");

      let formattedDob = "";
      if (loadedStudent?.dateOfBirth) {
        const dobDate = new Date(loadedStudent.dateOfBirth);
        if (!isNaN(dobDate.getTime())) {
          formattedDob = dobDate.toISOString().split("T")[0];
        }
      }

      setFormData({
        firstName: loadedStudent?.firstName || splitFirst,
        lastName: loadedStudent?.lastName || splitLast,
        email: loadedStudent?.email || "",
        phone: loadedStudent?.phone || "",
        level: loadedStudent?.level || "",
        dob: formattedDob, 
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

  useEffect(() => {
    if (!studentId) {
      return;
    }

    loadMonthSnapshot(selectedMonthDate, studentId);
  }, [selectedMonthDate, studentId]);

  useEffect(() => {
    const todayDateKey = toLocalDateKey(new Date());
    const currentMonthPrefix = todayDateKey.slice(0, 7);
    const monthPrefix = `${selectedMonthDate.getFullYear()}-${String(selectedMonthDate.getMonth() + 1).padStart(2, "0")}`;

    if (monthPrefix === currentMonthPrefix) {
      if (!selectedDateKey || !String(selectedDateKey).startsWith(`${monthPrefix}-`)) {
        setSelectedDateKey(todayDateKey);
      }
      return;
    }

    if (selectedDateKey && !String(selectedDateKey).startsWith(`${monthPrefix}-`)) {
      setSelectedDateKey("");
    }
  }, [selectedMonthDate, selectedDateKey]);

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
        dateOfBirth: formData.dob, 
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

// In page.jsx, inside handleExcuseSubmit
const handleExcuseSubmit = async () => {
    setSaving(true);
    try {
      console.log("Attempting direct fetch...");
      
      const response = await fetch("http://localhost:4010/attendance/excuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId,
          date: excuseModal.dateKey,
          absenceReason: excuseReason
        })
      });

      const result = await response.json();
      console.log("Direct Fetch Result:", result);

      if (response.ok) {
        await loadMonthSnapshot(selectedMonthDate, studentId);
        setExcuseModal(null);
      } else {
        console.error("Direct Fetch Failed:", result);
      }
    } catch (e) {
      console.error("Network Error:", e);
    } finally {
      setSaving(false);
    }
};

  const attendanceMap = useMemo(() => {
    return buildMonthMap(monthRows, selectedMonthDate, toLocalDateKey(new Date()));
  }, [monthRows, selectedMonthDate]);

  const monthDays = useMemo(() => {
    const daysInMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  }, [selectedMonthDate]);

  const firstDayOffset = useMemo(
    () => new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1).getDay(),
    [selectedMonthDate]
  );

  const monthLabel = useMemo(
    () => selectedMonthDate.toLocaleString("en-GB", { month: "long", year: "numeric" }),
    [selectedMonthDate]
  );

  const canGoToNextMonth = useMemo(() => {
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    return selectedMonthDate < currentMonthDate;
  }, [selectedMonthDate]);

  const handlePreviousMonth = () => {
    setSelectedMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (!canGoToNextMonth) {
      return;
    }

    setSelectedMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const selectedRow = monthRows[selectedDateKey] || null;
  const selectedDayNumber = selectedDateKey ? Number(String(selectedDateKey).slice(-2)) : null;
  const selectedDayStatus = selectedDayNumber ? attendanceMap[selectedDayNumber] || "neutral" : "neutral";
  const selectedStatusLabel = !selectedDateKey
    ? "Select date"
    : selectedRow?.status || (selectedDayStatus === "absent" ? "Absent" : selectedDateKey > toLocalDateKey(new Date()) ? "Upcoming" : "No record");
  const normalizedSelectedStatus = selectedRow?.status
    ? String(selectedRow.status).toLowerCase()
    : selectedDayStatus;

  if (loading) {
    return <StudentDetailSkeleton />;
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
  const departmentName = student.department || "Not assigned";
  const facultyName = departmentFacultyMap[departmentName] || "Not assigned";
  const guardianName = student.guardianName || "Not provided";
  const guardianPhone = student.guardianPhone || "Not provided";
  const guardianEmail = student.guardianEmail || "Not provided";
  const lastUpdatedLabel = formatRelativeLastUpdated(student.updatedAt || student.createdAt);

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

        <div className="flex items-center gap-3">
            {!isEditMode && (
              <button
                onClick={() => router.push(`/students/${studentId}?edit=true`)}
                className="inline-flex items-center cursor-pointer gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 shadow-xs"
                type="button"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
            )}

          <Link href="/students" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
            Back to roster
          </Link>
        </div>
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
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-gray-300 text-2xl font-semibold text-slate-700 ring-4 ring-white shadow-sm">
                      {avatar}
                    </div>
                  )}
                  <label className="absolute bottom-1 right-1 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-sky-600 text-white ring-3 ring-white transition hover:bg-sky-600">
                    <Pencil className="h-3 w-3" />
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
                <p className="mt-1 text-sm text-slate-500">Faculty: {facultyName}</p>
                <p className="mt-0.5 text-sm text-slate-500">Department: {departmentName}</p>
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
                        <input name="firstName" value={formData.firstName} onChange={handleInputChange} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Last Name</label>
                        <input name="lastName" value={formData.lastName} onChange={handleInputChange} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Date of Birth</label>
                      <input name="dob" type="date" value={formData.dob} onChange={handleInputChange} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Email</label>
                      <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Mobile</label>
                      <input name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Level</label>
                      <select name="level" value={formData.level} onChange={handleInputChange} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400">
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
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-GB", { day: 'numeric', month: 'long', year: 'numeric' }) : "Not provided"}</p>
                        <p className="text-sm text-slate-500">Date of Birth</p>
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
                      <input name="guardianName" value={formData.guardianName} onChange={handleInputChange} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Guardian Email</label>
                      <input name="guardianEmail" type="email" value={formData.guardianEmail} onChange={handleInputChange} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Guardian Phone</label>
                      <input name="guardianPhone" value={formData.guardianPhone} onChange={handleInputChange} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400" />
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
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button onClick={handlePreviousMonth} className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-800" type="button"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-36 px-2 text-center text-sm font-semibold text-slate-700">{monthLabel}</span>
                  <button onClick={handleNextMonth} disabled={!canGoToNextMonth} className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:text-slate-300" type="button"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>

              {monthError ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{monthError}</div> : null}

              <div className="mt-6 grid grid-cols-7 gap-2 text-center text-sm font-semibold text-slate-500">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <div key={day}>{day}</div>)}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayOffset }, (_, index) => <div key={`offset-${index}`} className="h-13 rounded-xl border border-transparent bg-transparent" aria-hidden="true" />)}
                {monthDays.map((day) => {
                  const dayDateKey = `${selectedMonthDate.getFullYear()}-${String(selectedMonthDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const statusKey = attendanceMap[day] || "neutral";
                  const tone = dayStyles[statusKey] || dayStyles.neutral;
                  const isSelected = selectedDateKey === dayDateKey;
                  const isAbsent = statusKey === "absent" && dayDateKey <= toLocalDateKey();
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => isAbsent ? setExcuseModal({ dateKey: dayDateKey }) : setSelectedDateKey(dayDateKey)}
                      className={`flex h-13 flex-col items-center justify-center rounded-xl border text-sm font-medium transition outline-none ${tone} ${isSelected ? "border-sky-300 ring-2 ring-sky-100" : "border-transparent"}`}
                    >
                      <span>{day}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />On-time</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Late</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Absent</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Excused</span>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-sky-700" />
                  Attendance Record Status
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeStyles[normalizedSelectedStatus] || statusBadgeStyles.neutral}`}>{selectedStatusLabel}</span>
              </div>

              <div className="mt-2 grid gap-4 rounded-full bg-slate-50 p-4 md:grid-cols-[100px_minmax(0,1fr)_180px]">
                <div className="grid h-24 w-full rounded-full place-items-center bg-gray-300 text-lg font-semibold text-white">
                  {profileImage ? (
                    <img src={profileImage} alt={`${fullName} profile`} className="h-full w-full rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="grid place-items-center rounded-full bg-transparent text-2xl font-semibold text-sky-700">{avatar}</div>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Check-in</p>
                    <p className="font-semibold text-slate-900">{selectedRow?.checkInTime || "--:--"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Check-out</p>
                    <p className="font-semibold text-slate-900">{selectedRow?.checkOutTime || "--:--"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Student ID</p>
                    <p className="font-semibold text-slate-900">{student.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Record Date</p>
                    <p className="font-semibold text-slate-900">{selectedDateKey || "--"}</p>
                  </div>
                  {selectedRow?.status === "Excused" && (
                   <div className="sm:col-span-2">
                      <p className="text-sm text-slate-500">Reason</p>
                      <p className="font-semibold text-slate-900">{selectedRow?.absenceReason || "No reason provided"}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center gap-3">
                  {isEditMode ? (
                    <>
                      <button onClick={handleSaveChanges} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <Link href={`/students/${studentId}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancel</Link>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">{lastUpdatedLabel}</div>
                      <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                        <Download className="h-4 w-4" /> Export
                      </button>
                    </>
                  )}
                </div>
              </div>

              {saveError ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{saveError}</div> : null}
              {saveSuccess ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{saveSuccess}</div> : null}
            </section>
          </div>
        </div>
      </div>

      {/* Excuse Modal */}
      {excuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800">Mark as Excused</h3>
            <textarea
              value={excuseReason}
              onChange={(e) => setExcuseReason(e.target.value)}
              className="mt-4 w-full rounded-lg border p-2 text-sm"
              placeholder="Reason for excuse..."
            />
            <div className="mt-6 flex gap-3">
              <button onClick={handleExcuseSubmit} className="flex-1 rounded-lg bg-sky-700 py-2 text-white text-sm font-semibold">Confirm</button>
              <button onClick={() => setExcuseModal(null)} className="flex-1 rounded-lg border py-2 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}