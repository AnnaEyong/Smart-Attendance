const { Router } = require("express");
const router = Router();

const attendanceController = require("../src/controllers/attendance.controller");
const {
  attendanceCheckInValidation,
  attendanceCheckOutValidation,
  attendanceDailyQueryValidation,
  attendanceMonthlyQueryValidation,
} = require("../utils/validations/attendance.validation");

router.post("/check-in", attendanceCheckInValidation, attendanceController.checkIn);
router.post("/check-out", attendanceCheckOutValidation, attendanceController.checkOut);
router.get("/daily", attendanceDailyQueryValidation, attendanceController.daily);
router.get("/monthly", attendanceMonthlyQueryValidation, attendanceController.monthly);

module.exports = router;
