const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    passwordResetOtpHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetOtpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    loginOtpHash: {
      type: String,
      default: null,
      select: false,
    },

    loginOtpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    loginOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    loginOtpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    loginOtpBlockedUntil: {
      type: Date,
      default: null,
      select: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);