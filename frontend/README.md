# Smart Attendance Frontend

This frontend is a Next.js application for biometric attendance. It handles:

- student biometric enrollment (face capture + descriptor creation)
- live camera scanning for check-in/check-out
- attendance dashboards and reports

## Tech Stack Used

- Next.js App Router
- React Client Components and Hooks
- Tailwind CSS
- lucide-react icons
- Fetch-based API client in src/lib/api.js
- Browser Camera API: navigator.mediaDevices.getUserMedia
- Canvas API for frame processing and descriptor creation

## How Face Attendance Works

This section is written for project defence. It explains exactly how the system works from enrollment to attendance recording.

## 1) Enrollment (Register Student)

Flow in src/app/@modal/(.)register-student/page.jsx:

1. Admin opens Register Student modal.
2. Camera is enabled with getUserMedia.
3. Admin captures one or more face snapshots.
4. Each image is converted to a 128-length numeric descriptor:
	- image is resized to 32x32
	- pixel grayscale values are grouped into 128 buckets
	- descriptor is normalized (unit vector)
5. Multiple captured descriptors are averaged and normalized into one final descriptor.
6. The student payload is sent to backend /student/create, including:
	- student profile fields
	- department and level
	- faceDescriptor (128 numbers)

Backend persistence:

- Student schema stores faceDescriptor as Number[] with strict length validation (128).

Why this matters for judges:

- Enrollment and recognition use the same descriptor method, so matching is consistent.
- Averaging multiple snapshots reduces noise from single-frame variation.

## 2) Live Recognition (Take Attendance)

Flow in src/app/dashboard/attendance/page.jsx:

1. Camera is enabled.
2. The page auto-scans at a short interval (no manual capture button required).
3. For each scan:
	- current video frame is captured to canvas
	- a lightweight face-presence check runs first (if no likely face, recognition is skipped)
	- frame descriptor is generated with the same 128-dimension method
	- descriptor is compared to all enrolled students that have biometrics
4. Matching uses Euclidean distance.
5. If best distance is above threshold (0.2), the face is treated as unknown.
6. If matched, the selected mode is applied:
	- check-in mode -> POST /attendance/check-in
	- check-out mode -> POST /attendance/check-out
7. A cooldown prevents repeatedly recording the same student in rapid succession.

Why this matters for judges:

- Face-presence gating reduces unnecessary scans when no one is in frame.
- Distance-threshold matching gives deterministic accept/reject behavior.
- Cooldown helps prevent duplicate entries during continuous camera scanning.

## 3) Attendance Recording Rules

Backend behavior in backend/src/controllers/attendance.controller.js:

- check-in:
  - validates student exists
  - creates or updates attendance row for the date
	- determines Late when check-in time is later than cutoff (default 13:00)
- check-out:
  - requires existing check-in for that date
  - updates checkOutTime
- daily report endpoint:
  - returns all students for that date
  - absent rows are generated when no check-in exists
	- includes summary counts (onTime, absent, late)

## APIs Used By Frontend

Defined in src/lib/api.js:

- createStudent(payload) -> POST /student/create
- fetchStudents() -> GET /student
- fetchDepartments() -> GET /department
- checkInStudent(payload) -> POST /attendance/check-in
- checkOutStudent(payload) -> POST /attendance/check-out
- fetchDailyAttendance(dateKey) -> GET /attendance/daily?date=YYYY-MM-DD

Set backend base URL with environment variable:

- NEXT_PUBLIC_API_BASE_URL (default: http://localhost:4010)
- NEXT_PUBLIC_FACE_API_MODEL_URL (default: /models/face-api)
- NEXT_PUBLIC_FACE_MATCH_ENGINE (optional: auto | custom, default: auto)

## Data Used In The Process

Student data required for biometric attendance:

- studentId
- firstName, lastName, fullName
- level
- department
- faceDescriptor (128-length normalized vector)
- optional profileImage for UI display

Attendance row fields used in reports and dashboard:

- date
- studentId
- checkInTime
- checkOutTime
- status (On-time/Late/Absent)
- isLate

## Defence Talking Points

Use this short script during your presentation:

1. Problem and approach:
	- We needed a fast school attendance workflow that avoids manual roll call.
	- We implemented browser-based face capture and descriptor matching.

2. Why this is reliable enough for the project scope:
	- Enrollment and recognition share one descriptor pipeline.
	- Matching is numeric and threshold-based (Euclidean distance), not random.
	- A face-presence pre-check and duplicate cooldown improve practical accuracy.

3. How attendance integrity is enforced:
	- Check-out is blocked if check-in does not exist.
	- Daily report generates absent records from missing check-ins.
	- Status is standardized to On-time, Late, and Absent.

4. System limitations and honest disclosure:
	- The app now supports a hybrid descriptor system.
	- face-api.js is used for new enrollments when available.
	- Legacy students keep using the custom descriptor fallback.
	- Performance depends on lighting, camera quality, and face angle.
	- Production systems should add liveness detection and stricter anti-spoofing controls.

## Running The Frontend

From frontend:

```bash
npm install
npm run dev
```

Frontend runs on http://localhost:3000 by default.

Make sure backend is running and reachable by NEXT_PUBLIC_API_BASE_URL.

## Important Notes

- Face matching is hybrid: face-api.js first, then custom descriptor fallback for legacy records.
- Local face-api model files are bundled under public/models/face-api for reliable offline loading.
- Recognition quality still depends on camera quality, lighting, and capture angle.
