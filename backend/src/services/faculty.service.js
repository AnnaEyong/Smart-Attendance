const Faculty = require("../models/Faculty");
const BaseService = require("./base.service");

class FacultyService extends BaseService {
  constructor() {
    super(Faculty);
  }
}

const facultyService = new FacultyService();

module.exports = facultyService;