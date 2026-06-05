const adminService = require("../services/admin.service");
const Admin = require("../models/Admin");
const { hash, compare } = require("../../utils/libs/bcrypt.lib");
const { sign } = require("../../utils/libs/jwt");
const crypto = require("crypto");
const { sendMail } = require("../../utils/libs/mail.lib");

const PASSWORD_RESET_OTP_TTL_MS = Number(process.env.PASSWORD_RESET_OTP_TTL_MS || 10 * 60 * 1000);
const LOGIN_OTP_TTL_MS = Number(process.env.LOGIN_OTP_TTL_MS || 5 * 60 * 1000);
const OTP_HASH_SECRET = String(process.env.OTP_HASH_SECRET || "smart-attendance-otp-secret");

const createSixDigitOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(`${otp}:${OTP_HASH_SECRET}`).digest("hex");
};

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

  const adminLookup = await Admin.findOne({ email }).select("+password +loginOtpHash +loginOtpExpiresAt");
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

  const otp = createSixDigitOtp();
  adminLookup.loginOtpHash = hashOtp(otp);
  adminLookup.loginOtpExpiresAt = new Date(Date.now() + LOGIN_OTP_TTL_MS);
  await adminLookup.save();

  const ttlMinutes = Math.max(1, Math.ceil(LOGIN_OTP_TTL_MS / 60000));
  try {
    await sendMail(
      adminLookup.email,
      "Smart Attendance Login OTP",
      `Your login OTP is ${otp}. It expires in ${ttlMinutes} minute(s).`
    );
  } catch (error) {
    console.error("Login OTP mail error:", error?.message || error);
    adminLookup.loginOtpHash = null;
    adminLookup.loginOtpExpiresAt = null;
    await adminLookup.save();
    return res.status(500).json({
      message: "Unable to send login OTP email. Please verify SMTP configuration.",
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`Login OTP for ${adminLookup.email}: ${otp}`);
  }

  return res.status(200).json({
    message: "OTP sent. Please verify to complete login.",
    data: {
      requiresOtp: true,
      email: adminLookup.email,
      admin: sanitizeAdmin(adminLookup),
    },
  });
};

const verifyLoginOtp = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();

  const admin = await Admin.findOne({ email }).select("+loginOtpHash +loginOtpExpiresAt");
  if (!admin || !admin.isActive) {
    return res.status(400).json({ message: "Invalid OTP or expired OTP" });
  }

  if (!admin.loginOtpHash || !admin.loginOtpExpiresAt) {
    return res.status(400).json({ message: "No login OTP found. Please sign in again." });
  }

  if (admin.loginOtpExpiresAt.getTime() < Date.now()) {
    admin.loginOtpHash = null;
    admin.loginOtpExpiresAt = null;
    await admin.save();
    return res.status(400).json({ message: "OTP has expired. Please sign in again." });
  }

  if (hashOtp(otp) !== admin.loginOtpHash) {
    return res.status(400).json({ message: "Invalid OTP or expired OTP" });
  }

  admin.loginOtpHash = null;
  admin.loginOtpExpiresAt = null;
  await admin.save();

  const token = sign({
    id: String(admin._id),
    email: admin.email,
    role: admin.role,
  });

  return res.status(200).json({
    message: "Admin login successful !!!",
    data: {
      token,
      admin: sanitizeAdmin(admin),
    },
  });
};

const requestPasswordOtp = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  const admin = await Admin.findOne({ email }).select("+passwordResetOtpHash +passwordResetOtpExpiresAt");
  if (!admin || !admin.isActive) {
    return res.status(200).json({
      message: "If an active account exists for this email, an OTP has been sent.",
    });
  }

  const otp = createSixDigitOtp();
  const otpHash = hashOtp(otp);
  const otpExpiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);

  admin.passwordResetOtpHash = otpHash;
  admin.passwordResetOtpExpiresAt = otpExpiresAt;
  await admin.save();

  const ttlMinutes = Math.max(1, Math.ceil(PASSWORD_RESET_OTP_TTL_MS / 60000));
  try {
    await sendMail(
      admin.email,
      "Smart Attendance Password Reset OTP",
      `Your OTP is ${otp}. It expires in ${ttlMinutes} minute(s).`
    );
  } catch (error) {
    console.error("Password reset OTP mail error:", error?.message || error);
    admin.passwordResetOtpHash = null;
    admin.passwordResetOtpExpiresAt = null;
    await admin.save();
    return res.status(500).json({
      message: "Unable to send password reset OTP email. Please verify SMTP configuration.",
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`Password reset OTP for ${admin.email}: ${otp}`);
  }

  return res.status(200).json({
    message: "If an active account exists for this email, an OTP has been sent.",
  });
};

const resetPasswordWithOtp = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();
  const newPassword = String(req.body.newPassword || "");

  const admin = await Admin.findOne({ email }).select("+password +passwordResetOtpHash +passwordResetOtpExpiresAt");
  if (!admin || !admin.isActive) {
    return res.status(400).json({ message: "Invalid OTP or expired OTP" });
  }

  if (!admin.passwordResetOtpHash || !admin.passwordResetOtpExpiresAt) {
    return res.status(400).json({ message: "Please request a new OTP" });
  }

  if (admin.passwordResetOtpExpiresAt.getTime() < Date.now()) {
    admin.passwordResetOtpHash = null;
    admin.passwordResetOtpExpiresAt = null;
    await admin.save();
    return res.status(400).json({ message: "OTP has expired. Please request a new OTP" });
  }

  const isOtpValid = hashOtp(otp) === admin.passwordResetOtpHash;
  if (!isOtpValid) {
    return res.status(400).json({ message: "Invalid OTP or expired OTP" });
  }

  admin.password = await hash(newPassword);
  admin.passwordResetOtpHash = null;
  admin.passwordResetOtpExpiresAt = null;
  await admin.save();

  return res.status(200).json({ message: "Password reset successful. You can now log in." });
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
  verifyLoginOtp,
  requestPasswordOtp,
  resetPasswordWithOtp,
  profile,
  findMany,
};
