const { Router } = require("express");
const router = Router();

const facultyController = require("../src/controllers/faculty.controller");
const {
  facultyCreateValidation,
  facultyIdParamValidation,
} = require("../utils/validations/faculty.validation");

router.post("/create", facultyCreateValidation, facultyController.create);
router.get("/", facultyController.findMany);
router.get("/find/:id", facultyIdParamValidation, facultyController.find);
router.put("/update/:id", facultyIdParamValidation, facultyController.update);
router.delete("/delete/:id", facultyIdParamValidation, facultyController.remove);

module.exports = router;