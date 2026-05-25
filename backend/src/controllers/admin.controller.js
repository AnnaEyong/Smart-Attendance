const adminService = require("../services/admin.service");
const Admin = require("../models/Admin");
const { hash, compare } = require("../../utils/libs/bcrypt.lib");
const { sign } = require("../../utils/libs/jwt");

const sanitizeAdmin = (admin) => {
  if (!admin) {
    return null;
  }

  return {
    id: admin._id,
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
};

const create = async (req, res) => {
  const payload = { ...req.body };
  payload.email = String(payload.email || "").trim().toLowerCase();

  const exists = await Admin.findOne({ email: payload.email });
  if (exists) {
    return res.status(400).json({ message: "Admin email already exists" });
  }

  payload.password = await hash(payload.password);

  const result = await adminService.create(payload);
  if (result.error) {
    return res.status(400).json({ message: result.message });
  }

  return res.status(201).json({
    message: "Admin Created Successfully!!!",
    data: sanitizeAdmin(result.data),
  });
};

const login = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const adminLookup = await Admin.findOne({ email }).select("+password");
  if (!adminLookup) {
    return res.status(400).json({ message: "Invalid credentials !!!" });
  }

  const isMatch = await compare(password, adminLookup.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials !!!" });
  }

  if (!adminLookup.isActive) {
    return res.status(403).json({ message: "Admin account is inactive" });
  }

  const token = sign({
    id: String(adminLookup._id),
    email: adminLookup.email,
    role: adminLookup.role,
  });

  return res.status(200).json({
    message: "Admin login successful !!!",
    data: {
      token,
      admin: sanitizeAdmin(adminLookup),
    },
  });
};

const profile = async (req, res) => {
  const result = await adminService.findBy(req.user.id);
  if (result.error || !result.data) {
    return res.status(404).json({ message: "Admin not found" });
  }

  return res.status(200).json({
    message: "Admin profile fetched successfully!!!",
    data: sanitizeAdmin(result.data),
  });
};

const findMany = async (_req, res) => {
  const result = await adminService.find({});
  if (result.error) {
    return res.status(400).json({ message: result.message });
  }

  return res.status(200).json({
    message: "Admins fetched successfully!!!",
    data: result.data.map(sanitizeAdmin),
  });
};

module.exports = {
  create,
  login,
  profile,
  findMany,
};
