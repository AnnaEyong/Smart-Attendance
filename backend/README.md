# Smart Attendance Backend

Simple, beginner-friendly Express backend for school attendance.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose models
- Zod validation

## Rules Implemented

- Attendance is school-level only (not class attendance).
- Student is **Absent** if no check-in exists for the day.
- Student is **Late** if check-in time is after the late cutoff (`08:00` by default).
- Student is **Present** if checked in on time.

## Data Behavior

- No default students or attendance records are preloaded.
- All data is created through API requests.

## Models

- Student model: [src/models/Student.js](src/models/Student.js)
- Attendance model: [src/models/Attendance.js](src/models/Attendance.js)

Student model uses schema fields like `studentId`, `fullName`, optional `email`, and optional `faceDescriptor` (must be 128 values when provided).

## Run

```bash
cd backend
npm install
npm run dev
```

Server starts on `http://localhost:4000` by default.

Make sure MongoDB is running and `.env` has a valid `MONGO_URI`.

## API Endpoints

### Health
- `GET /health`

### Students
- `POST /student/create`
- `GET /student`
- `GET /student/find/:id`
- `PUT /student/update/:id`
- `DELETE /student/delete/:id`

Example body:

```json
{
  "studentId": "ST-3001",
  "fullName": "Jane Doe",
  "grade": "10th Grade"
}
```

### Attendance
- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `GET /attendance/daily?date=2026-05-25`

### Admin Access
- `POST /admin/create`
- `POST /admin/login`
- `GET /admin/profile` (requires `Authorization: Bearer <token>`)
- `GET /admin/` (requires `Authorization: Bearer <token>`)

Create admin body:

```json
{
  "fullName": "Platform Admin",
  "email": "admin@school.com",
  "password": "admin123",
  "role": "super_admin"
}
```

Check-in body:

```json
{
  "studentId": "ST-2041",
  "timestamp": "2026-05-25T07:55:00",
  "lateCutoff": "08:00"
}
```

Check-out body:

```json
{
  "studentId": "ST-2041",
  "timestamp": "2026-05-25T15:30:00"
}
```
