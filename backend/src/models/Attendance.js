const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    checkInTime: { type: String, default: null },
    checkOutTime: { type: String, default: null },
    status: {
      type: String,
      enum: ["Present", "Late", "Absent"],
      default: "Present",
    },
    isLate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

attendanceSchema.index({ date: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
