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

module.exports = {
  adminCreateValidation,
  adminLoginValidation,
};
