require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { connect } = require("./configs/database.config");
const Attendance = require("./src/models/Attendance");
const Student = require("./src/models/Student");
const studentRoute = require("./routes/student.route");
const attendanceRoute = require("./routes/attendance.route");
const adminRoute = require("./routes/admin.route");
const facultyRoute = require("./routes/faculty.route");
const departmentRoute = require("./routes/department.route");

const run = async () => {
  try {
    const PORT = process.env.PORT || 4010;
    const app = express();

    await connect();

    // One-time compatibility migration for legacy status values.
    const migrationResult = await Attendance.updateMany(
      { status: "Present" },
      { $set: { status: "On-time" } }
    );

    if (migrationResult.modifiedCount > 0) {
      console.log(`Migrated ${migrationResult.modifiedCount} attendance records to On-time status.`);
    }

    const descriptorEngineMigration = await Student.updateMany(
      {
        faceDescriptor: { $exists: true, $ne: null },
        $or: [
          { faceDescriptorEngine: { $exists: false } },
          { faceDescriptorEngine: null },
          { faceDescriptorEngine: "custom" },
        ],
      },
      { $set: { faceDescriptorEngine: "face-api" } }
    );

    if (descriptorEngineMigration.modifiedCount > 0) {
      console.log(`Migrated ${descriptorEngineMigration.modifiedCount} student descriptors to face-api engine.`);
    }

    app.use(cors());
    app.use(express.json());

    app.get("/health", (_req, res) => {
      return res.status(200).json({
        message: "Smart Attendance backend is running",
      });
    });

    app.use("/student", studentRoute);
    app.use("/attendance", attendanceRoute);
    app.use("/admin", adminRoute);
    app.use("/faculty", facultyRoute);
    app.use("/department", departmentRoute);

    app.use((req, res) => {
      return res.status(404).json({
        message: `Route not found: ${req.method} ${req.originalUrl}`,
      });
    });

    app.listen(PORT, () => {
      console.log("Application run on http://localhost:" + PORT);
    });
  } catch (error) {
    console.error(error);
  }
};

run();
