const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true, default: "" },
    dateOfBirth: { type: Date, required: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    level: {
      type: String,
      required: true,
      enum: ["Level 100", "Level 200", "Level 300", "Level 400", "Level 500"],
    },
    guardianName: { type: String, required: true, trim: true },
    guardianPhone: { type: String, required: true, trim: true },
    guardianEmail: { type: String, required: true, trim: true },
    faceDescriptor: {
      type: [Number],
      default: undefined,
      validate: {
        validator: function (arr) {
          if (!arr) {
            return true;
          }

          return Array.isArray(arr) && arr.length === 128;
        },
        message: "faceDescriptor must contain exactly 128 numbers",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Student", studentSchema);
