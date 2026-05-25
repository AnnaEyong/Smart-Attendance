const { Router } = require("express");
const router = Router();

const adminController = require("../src/controllers/admin.controller");
const authMiddleware = require("../utils/middlewares/auth.middleware");
const {
  adminCreateValidation,
  adminLoginValidation,
} = require("../utils/validations/admin.validation");

router.post("/create", adminCreateValidation, adminController.create);
router.post("/login", adminLoginValidation, adminController.login);
router.get("/", authMiddleware, adminController.findMany);
router.get("/profile", authMiddleware, adminController.profile);

module.exports = router;
