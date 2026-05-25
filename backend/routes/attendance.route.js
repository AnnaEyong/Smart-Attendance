const { Router } = require("express");
const router = Router();

const attendanceController = require("../src/controllers/attendance.controller");
const {
  attendanceCheckInValidation,
  attendanceCheckOutValidation,
  attendanceDailyQueryValidation,
} = require("../utils/validations/attendance.validation");

router.post("/check-in", attendanceCheckInValidation, attendanceController.checkIn);
router.post("/check-out", attendanceCheckOutValidation, attendanceController.checkOut);
router.get("/daily", attendanceDailyQueryValidation, attendanceController.daily);

module.exports = router;
