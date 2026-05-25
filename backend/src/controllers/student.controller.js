const studentService = require("../services/student.service");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");

const normalizeStudentPayload = (body = {}) => {
  const firstName = body.firstName;
  const lastName = body.lastName;
  const hasNameInput = typeof firstName === "string" || typeof lastName === "string";
  const fullName = hasNameInput ? `${firstName || ""} ${lastName || ""}`.trim() : undefined;

  return {
    studentId: body.studentId || body.id,
    firstName,
    lastName,
    fullName,
    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    email: body.email,
    phone: body.phone || "",
    level: body.level,
    guardianName: body.guardianName,
    guardianPhone: body.guardianPhone,
    guardianEmail: body.guardianEmail,
    faceDescriptor: body.faceDescriptor,
  };
};

const create = async (req, res) => {
  const payload = normalizeStudentPayload(req.body);

  const exists = await Student.findOne({ studentId: payload.studentId });
  if (exists) {
    return res.status(400).json({
      message: "Student ID already exists",
    });
  }

  const result = await studentService.create(payload);
  if (result.error) {
    return res.status(400).json({
      message: result.message,
    });
  }

  return res.status(201).json({
    message: "Student Created Successfully!!!",
    data: result.data,
  });
};

const findMany = async (req, res) => {
  const result = await studentService.find(req.query);
  if (result.error) {
    return res.status(400).json({
      message: result.message,
    });
  }

  return res.status(200).json({
    message: "Students fetched successfully!!!",
    data: result.data,
  });
};

const find = async (req, res) => {
  const student = await Student.findOne({ studentId: req.params.id });
  if (!student) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  return res.status(200).json({
    message: "Student fetched successfully!!!",
    data: student,
  });
};

const update = async (req, res) => {
  const payload = normalizeStudentPayload(req.body);
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  if (!payload.studentId) {
    delete payload.studentId;
  }

  const updated = await Student.findOneAndUpdate({ studentId: req.params.id }, payload, { new: true });
  if (!updated) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  return res.status(200).json({
    message: "Student updated successfully!!!",
    data: updated,
  });
};

const remove = async (req, res) => {
  const deletedStudent = await Student.findOneAndDelete({ studentId: req.params.id });
  if (!deletedStudent) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  await Attendance.deleteMany({ studentId: deletedStudent._id });

  return res.status(200).json({
    message: "Student deleted successfully!!!",
  });
};

module.exports = {
  create,
  findMany,
  find,
  update,
  remove,
};
