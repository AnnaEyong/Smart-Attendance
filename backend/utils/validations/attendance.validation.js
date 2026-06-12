const { z } = require("zod");
const Validation = require("./index");

const checkInSchema = z.object({
  studentId: z.string().min(1),
  timestamp: z.string().optional(),
  lateCutoff: z.string().optional(),
});

const checkOutSchema = z.object({
  studentId: z.string().min(1),
  timestamp: z.string().optional(),
});

const dailyQuerySchema = z.object({
  date: z.string().optional(),
});

const monthlyQuerySchema = z.object({
  studentId: z.string().min(1),
  month: z.string().optional(),
});

const excuseAttendanceSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  date: z.string().min(1, "Date is required"),
  absenceReason: z.string().min(3, "Reason must be at least 3 characters"),
});

const attendanceCheckInValidation = (req, res, next) => {
  const result = Validation(checkInSchema, req.body);

  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

const attendanceCheckOutValidation = (req, res, next) => {
  const result = Validation(checkOutSchema, req.body);

  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

const attendanceDailyQueryValidation = (req, res, next) => {
  const result = Validation(dailyQuerySchema, req.query);

  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

const attendanceMonthlyQueryValidation = (req, res, next) => {
  const result = Validation(monthlyQuerySchema, req.query);

  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

const attendanceExcuseValidation = (req, res, next) => {
  const result = Validation(excuseAttendanceSchema, req.body);

  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

const attendanceUpdateSchema = z.object({
  status: z.enum([
    "On-time",
    "Late",
    "Absent",
    "Excused",
  ]),
});

const attendanceUpdateValidation = (req, res, next) => {
  const result = Validation(attendanceUpdateSchema, req.body);

  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

module.exports = {
  attendanceCheckInValidation,
  attendanceCheckOutValidation,
  attendanceDailyQueryValidation,
  attendanceMonthlyQueryValidation,
  attendanceExcuseValidation,
  attendanceUpdateValidation,
};