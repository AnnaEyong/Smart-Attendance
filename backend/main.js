require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { connect } = require("./configs/database.config");
const studentRoute = require("./routes/student.route");
const attendanceRoute = require("./routes/attendance.route");
const adminRoute = require("./routes/admin.route");

const run = async () => {
  try {
    const PORT = process.env.PORT || 4010;
    const app = express();

    await connect();

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
