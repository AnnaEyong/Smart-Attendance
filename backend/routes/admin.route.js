const { Router } = require("express");
const router = Router();

const adminController = require("../src/controllers/admin.controller");
const authMiddleware = require("../utils/middlewares/auth.middleware");
const {
  adminCreateValidation,
  adminLoginValidation,
  adminVerifyLoginOtpValidation,
  adminResendLoginOtpValidation,
  adminRequestOtpValidation,
  adminResetPasswordWithOtpValidation,
} = require("../utils/validations/admin.validation");

router.post("/create", adminCreateValidation, adminController.create);
router.post("/login", adminLoginValidation, adminController.login);
router.post("/verify-login-otp", adminVerifyLoginOtpValidation, adminController.verifyLoginOtp);
router.post("/resend-login-otp", adminResendLoginOtpValidation, adminController.resendLoginOtp);
router.post("/request-password-otp", adminRequestOtpValidation, adminController.requestPasswordOtp);
router.post("/reset-password-with-otp", adminResetPasswordWithOtpValidation, adminController.resetPasswordWithOtp);
router.get("/", authMiddleware, adminController.findMany);
router.get("/profile", authMiddleware, adminController.profile);

module.exports = router;
