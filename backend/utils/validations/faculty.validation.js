const { z } = require("zod");
const Validation = require("./index");

const facultyCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().or(z.literal("")),
});

const facultyIdParamSchema = z.object({
  id: z.string().min(1),
});

const facultyCreateValidation = (req, res, next) => {
  const result = Validation(facultyCreateSchema, req.body);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

const facultyIdParamValidation = (req, res, next) => {
  const result = Validation(facultyIdParamSchema, req.params);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

module.exports = {
  facultyCreateValidation,
  facultyIdParamValidation,
};