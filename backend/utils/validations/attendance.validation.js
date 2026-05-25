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

module.exports = {
  attendanceCheckInValidation,
  attendanceCheckOutValidation,
  attendanceDailyQueryValidation,
};
