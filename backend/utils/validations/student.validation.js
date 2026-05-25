const { z } = require("zod");
const Validation = require("./index");

const studentCreateSchema = z
  .object({
    id: z.string().min(1).optional(),
    studentId: z.string().min(1).optional(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().or(z.literal("")),
    level: z.enum(["Level 100", "Level 200", "Level 300", "Level 400", "Level 500"]),
    guardianName: z.string().min(1),
    guardianPhone: z.string().min(1),
    guardianEmail: z.string().email(),
    faceDescriptor: z.array(z.number()).length(128).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.studentId && !data.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["studentId"],
        message: "studentId or id is required",
      });
    }
  });

const studentIdParamSchema = z.object({
  id: z.string().min(1),
});

const studentCreateValidation = (req, res, next) => {
  const result = Validation(studentCreateSchema, req.body);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

const studentIdParamValidation = (req, res, next) => {
  const result = Validation(studentIdParamSchema, req.params);
  if (!result.isValid) {
    return res.status(400).json(result.error);
  }

  next();
};

module.exports = {
  studentCreateValidation,
  studentIdParamValidation,
};
