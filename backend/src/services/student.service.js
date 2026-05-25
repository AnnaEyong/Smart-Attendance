const Student = require("../models/Student");
const BaseService = require("../services/base.service");

class StudentService extends BaseService {
  constructor() {
    super(Student);
  }
}

const studentService = new StudentService();

module.exports = studentService;
