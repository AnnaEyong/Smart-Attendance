const Department = require("../models/Department");
const BaseService = require("./base.service");

class DepartmentService extends BaseService {
  constructor() {
    super(Department);
  }
}

const departmentService = new DepartmentService();

module.exports = departmentService;