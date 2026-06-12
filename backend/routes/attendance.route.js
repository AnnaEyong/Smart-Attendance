const { Router } = require("express");
const router = Router();

const attendanceController = require("../src/controllers/attendance.controller");

const {
  attendanceCheckInValidation,
  attendanceCheckOutValidation,
  attendanceDailyQueryValidation,
  attendanceMonthlyQueryValidation,
  attendanceExcuseValidation,
  attendanceUpdateValidation,
} = require("../utils/validations/attendance.validation");

// Attendance actions
router.post(
  "/check-in",
  attendanceCheckInValidation,
  attendanceController.checkIn
);

router.post(
  "/check-out",
  attendanceCheckOutValidation,
  attendanceController.checkOut
);

// Mark a student as excused
router.post(
  "/excuse",
  attendanceExcuseValidation,
  attendanceController.excuseAttendance
);

// Reports
router.get(
  "/daily",
  attendanceDailyQueryValidation,
  attendanceController.daily
);

router.get(
  "/monthly",
  attendanceMonthlyQueryValidation,
  attendanceController.monthly
);

router.patch(
  "/:attendanceId/status",
  attendanceUpdateValidation,
  attendanceController.updateAttendanceStatus
);

module.exports = router;