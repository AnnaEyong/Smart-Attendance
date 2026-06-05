const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4010";
const TOKEN_KEY = "smart_attendance_admin_token";
const TOKEN_COOKIE_KEY = "smart_attendance_admin_token";

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const validationMessage = Array.isArray(payload?.path) && payload.path.length > 0
      ? payload.path[0]?.message
      : null;
    throw new Error(validationMessage || payload?.message || "Request failed");
  }

  return payload;
}

export function getAdminToken() {
  if (typeof window === "undefined") {
    return "";
  }

  const localToken = localStorage.getItem(TOKEN_KEY) || "";
  if (localToken) {
    return localToken;
  }

  const cookieToken = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${TOKEN_COOKIE_KEY}=`));

  return cookieToken ? decodeURIComponent(cookieToken.slice(TOKEN_COOKIE_KEY.length + 1)) : "";
}

export function setAdminToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=604800; SameSite=Lax`;
}

export function clearAdminToken() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function loginAdmin({ email, password }) {
  return request("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function verifyAdminLoginOtp({ email, otp }) {
  return request("/admin/verify-login-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export function requestAdminPasswordOtp({ email }) {
  return request("/admin/request-password-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetAdminPasswordWithOtp({ email, otp, newPassword }) {
  return request("/admin/reset-password-with-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword }),
  });
}

export function createStudent(payload) {
  return request("/student/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchDepartments() {
  return request("/department");
}

export function fetchStudents() {
  return request("/student");
}

export function fetchStudentById(studentId) {
  return request(`/student/find/${encodeURIComponent(studentId)}`);
}

export function updateStudent(studentId, payload) {
  return request(`/student/update/${encodeURIComponent(studentId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteStudent(studentId) {
  return request(`/student/delete/${encodeURIComponent(studentId)}`, {
    method: "DELETE",
  });
}

export function checkInStudent(payload) {
  return request("/attendance/check-in", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function checkOutStudent(payload) {
  return request("/attendance/check-out", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchDailyAttendance(dateKey) {
  return request(`/attendance/daily?date=${encodeURIComponent(dateKey)}`);
}

export function fetchStudentMonthlyAttendance(studentId, monthKey) {
  return request(
    `/attendance/monthly?studentId=${encodeURIComponent(studentId)}&month=${encodeURIComponent(monthKey)}`
  );
}

export function fetchAdminProfile() {
  const token = getAdminToken();

  return request("/admin/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export { API_BASE_URL };
