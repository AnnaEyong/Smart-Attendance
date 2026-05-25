const Admin = require("../models/Admin");
const BaseService = require("../services/base.service");

class AdminService extends BaseService {
  constructor() {
    super(Admin);
  }
}

const adminService = new AdminService();

module.exports = adminService;
