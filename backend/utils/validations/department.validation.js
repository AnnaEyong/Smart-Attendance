const { z } = require("zod");
const Validation = require("./index");

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid facultyId");

const departmentCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().or(z.literal("")),
  facultyId: objectIdSchema.optional(),
});

const departmentIdParamSchema = z.object({
  id: z.string().min(1),
});

const departmentCreateValidation = (req, res, next) => {
  const result = Validation(departmentCreateSchema, req.body);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

const departmentIdParamValidation = (req, res, next) => {
  const result = Validation(departmentIdParamSchema, req.params);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

module.exports = {
  departmentCreateValidation,
  departmentIdParamValidation,
};