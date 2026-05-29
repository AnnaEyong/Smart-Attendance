const Faculty = require("../models/Faculty");
const Department = require("../models/Department");
const facultyService = require("../services/faculty.service");

const normalizeFacultyPayload = (body = {}) => {
  return {
    name: typeof body.name === "string" ? body.name.trim() : body.name,
    code: typeof body.code === "string" ? body.code.trim() : body.code,
  };
};

const create = async (req, res) => {
  const payload = normalizeFacultyPayload(req.body);

  const exists = await Faculty.findOne({ name: payload.name });
  if (exists) {
    return res.status(400).json({ message: "Faculty already exists" });
  }

  const result = await facultyService.create(payload);
  if (result.error) {
    return res.status(400).json({ message: result.message });
  }

  return res.status(201).json({
    message: "Faculty Created Successfully!!!",
    data: result.data,
  });
};

const findMany = async (req, res) => {
  const result = await facultyService.find(req.query);
  if (result.error) {
    return res.status(400).json({ message: result.message });
  }

  return res.status(200).json({
    message: "Faculties fetched successfully!!!",
    data: result.data,
  });
};

const find = async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) {
    return res.status(404).json({ message: "Faculty not found" });
  }

  return res.status(200).json({
    message: "Faculty fetched successfully!!!",
    data: faculty,
  });
};

const update = async (req, res) => {
  const payload = normalizeFacultyPayload(req.body);
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  if (payload.name) {
    const existing = await Faculty.findOne({
      name: payload.name,
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res.status(400).json({ message: "Faculty already exists" });
    }
  }

  const updated = await Faculty.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    return res.status(404).json({ message: "Faculty not found" });
  }

  return res.status(200).json({
    message: "Faculty updated successfully!!!",
    data: updated,
  });
};

const remove = async (req, res) => {
  const linkedDepartments = await Department.countDocuments({ facultyId: req.params.id });
  if (linkedDepartments > 0) {
    return res.status(400).json({
      message: "Faculty cannot be deleted while departments are linked to it",
    });
  }

  const deletedFaculty = await Faculty.findByIdAndDelete(req.params.id);
  if (!deletedFaculty) {
    return res.status(404).json({ message: "Faculty not found" });
  }

  return res.status(200).json({
    message: "Faculty deleted successfully!!!",
  });
};

module.exports = {
  create,
  findMany,
  find,
  update,
  remove,
};