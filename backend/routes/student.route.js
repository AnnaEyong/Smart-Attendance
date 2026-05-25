const { Router } = require("express");
const router = Router();

const studentController = require("../src/controllers/student.controller");
const {
  studentCreateValidation,
  studentIdParamValidation,
} = require("../utils/validations/student.validation");

router.post("/create", studentCreateValidation, studentController.create);
router.get("/", studentController.findMany);
router.get("/find/:id", studentIdParamValidation, studentController.find);
router.put("/update/:id", studentIdParamValidation, studentController.update);
router.delete("/delete/:id", studentIdParamValidation, studentController.remove);

module.exports = router;
