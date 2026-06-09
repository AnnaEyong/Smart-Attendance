const { z } = require("zod");
const Validation = require("./index");

const adminCreateSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "super_admin"]).optional(),
  isActive: z.boolean().optional(),
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const adminVerifyLoginOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
});

const adminResendLoginOtpSchema = z.object({
  email: z.string().email(),
});

const adminRequestOtpSchema = z.object({
  email: z.string().email(),
});

const adminResetPasswordWithOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(6),
});

const adminCreateValidation = (req, res, next) => {
  const result = Validation(adminCreateSchema, req.body);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  return next();
};

const adminLoginValidation = (req, res, next) => {
  const result = Validation(adminLoginSchema, req.body);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  return next();
};

const adminVerifyLoginOtpValidation = (req, res, next) => {
  const result = Validation(adminVerifyLoginOtpSchema, req.body);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  return next();
};

const adminResendLoginOtpValidation = (req, res, next) => {
  const result = Validation(adminResendLoginOtpSchema, req.body);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  return next();
};

const adminRequestOtpValidation = (req, res, next) => {
  const result = Validation(adminRequestOtpSchema, req.body);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  return next();
};

const adminResetPasswordWithOtpValidation = (req, res, next) => {
  const result = Validation(adminResetPasswordWithOtpSchema, req.body);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  return next();
};

module.exports = {
  adminCreateValidation,
  adminLoginValidation,
  adminVerifyLoginOtpValidation,
  adminResendLoginOtpValidation,
  adminRequestOtpValidation,
  adminResetPasswordWithOtpValidation,
};
