const { Router } = require("express");
const router = Router();

const departmentController = require("../src/controllers/department.controller");
const {
  departmentCreateValidation,
  departmentIdParamValidation,
} = require("../utils/validations/department.validation");

router.post("/create", departmentCreateValidation, departmentController.create);
router.get("/", departmentController.findMany);
router.get("/find/:id", departmentIdParamValidation, departmentController.find);
router.put("/update/:id", departmentIdParamValidation, departmentController.update);
router.delete("/delete/:id", departmentIdParamValidation, departmentController.remove);

module.exports = router;