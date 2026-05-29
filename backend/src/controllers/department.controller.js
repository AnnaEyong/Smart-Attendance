const Department = require("../models/Department");
const Faculty = require("../models/Faculty");
const departmentService = require("../services/department.service");

const normalizeDepartmentPayload = (body = {}) => {
  return {
    name: typeof body.name === "string" ? body.name.trim() : body.name,
    code: typeof body.code === "string" ? body.code.trim() : body.code,
    facultyId: body.facultyId || undefined,
  };
};

const create = async (req, res) => {
  const payload = normalizeDepartmentPayload(req.body);

  if (payload.facultyId) {
    const faculty = await Faculty.findById(payload.facultyId);
    if (!faculty) {
      return res.status(400).json({ message: "Faculty not found" });
    }
  }

  const exists = await Department.findOne({ name: payload.name });
  if (exists) {
    return res.status(400).json({ message: "Department already exists" });
  }

  const result = await departmentService.create(payload);
  if (result.error) {
    return res.status(400).json({ message: result.message });
  }

  const createdDepartment = await Department.findById(result.data._id).populate("facultyId");

  return res.status(201).json({
    message: "Department Created Successfully!!!",
    data: createdDepartment || result.data,
  });
};

const findMany = async (req, res) => {
  const result = await Department.find(req.query).populate("facultyId");
  return res.status(200).json({
    message: "Departments fetched successfully!!!",
    data: result,
  });
};

const find = async (req, res) => {
  const department = await Department.findById(req.params.id).populate("facultyId");
  if (!department) {
    return res.status(404).json({ message: "Department not found" });
  }

  return res.status(200).json({
    message: "Department fetched successfully!!!",
    data: department,
  });
};

const update = async (req, res) => {
  const payload = normalizeDepartmentPayload(req.body);
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  if (payload.facultyId) {
    const faculty = await Faculty.findById(payload.facultyId);
    if (!faculty) {
      return res.status(400).json({ message: "Faculty not found" });
    }
  }

  if (payload.name) {
    const existing = await Department.findOne({
      name: payload.name,
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res.status(400).json({ message: "Department already exists" });
    }
  }

  const updated = await Department.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  }).populate("facultyId");

  if (!updated) {
    return res.status(404).json({ message: "Department not found" });
  }

  return res.status(200).json({
    message: "Department updated successfully!!!",
    data: updated,
  });
};

const remove = async (req, res) => {
  const deletedDepartment = await Department.findByIdAndDelete(req.params.id);
  if (!deletedDepartment) {
    return res.status(404).json({ message: "Department not found" });
  }

  return res.status(200).json({
    message: "Department deleted successfully!!!",
  });
};

module.exports = {
  create,
  findMany,
  find,
  update,
  remove,
};