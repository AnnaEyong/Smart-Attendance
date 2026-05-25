const Attendance = require("../models/Attendance");
const BaseService = require("../services/base.service");

class AttendanceService extends BaseService {
  constructor() {
    super(Attendance);
  }
}

const attendanceService = new AttendanceService();

module.exports = attendanceService;
