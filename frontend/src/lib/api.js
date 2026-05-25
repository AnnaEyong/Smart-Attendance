const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4010";
const TOKEN_KEY = "smart_attendance_admin_token";

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
    throw new Error(payload?.message || "Request failed");
  }

  return payload;
}

export function getAdminToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAdminToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

export function loginAdmin({ email, password }) {
  return request("/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function createStudent(payload) {
  return request("/student/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export function fetchAdminProfile() {
  const token = getAdminToken();

  return request("/admin/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export { API_BASE_URL };
