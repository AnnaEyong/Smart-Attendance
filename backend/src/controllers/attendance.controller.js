const attendanceService = require("../services/attendance.service");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

const toDateKey = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeString = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const isLateTime = (time24, lateCutoff = "08:00") => {
  if (!time24) {
    return false;
  }

  return time24 > lateCutoff;
};

const toPublicAttendance = (record, studentId) => {
  return {
    date: record.date,
    studentId,
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime,
    status: record.status,
    isLate: record.isLate,
  };
};

const checkIn = async (req, res) => {
  const student = await Student.findOne({ studentId: req.body.studentId });
  if (!student) {
    return res.status(400).json({
      message: "Student not found.",
    });
  }

  const date = toDateKey(req.body.timestamp);
  const time = toTimeString(req.body.timestamp);
  if (!date || !time) {
    return res.status(400).json({
      message: "Invalid timestamp.",
    });
  }

  const existing = await Attendance.findOne({ date, studentId: student._id });
  if (existing && existing.checkInTime) {
    return res.status(400).json({
      message: "Student is already checked in for this date.",
    });
  }

  const late = isLateTime(time, req.body.lateCutoff || "08:00");

  if (existing) {
    await Attendance.updateOne(
      { date, studentId: student._id },
      {
        checkInTime: time,
        status: late ? "Late" : "Present",
        isLate: late,
      }
    );

    const refreshed = await Attendance.findOne({ date, studentId: student._id });
    return res.status(200).json({
      message: "Check-in saved successfully!!!",
      data: toPublicAttendance(refreshed, student.studentId),
    });
  }

  const created = await attendanceService.create({
    date,
    studentId: student._id,
    checkInTime: time,
    checkOutTime: null,
    status: late ? "Late" : "Present",
    isLate: late,
  });

  if (created.error) {
    return res.status(400).json({
      message: created.message,
    });
  }

  return res.status(200).json({
    message: "Check-in saved successfully!!!",
    data: toPublicAttendance(created.data, student.studentId),
  });
};

const checkOut = async (req, res) => {
  const student = await Student.findOne({ studentId: req.body.studentId });
  if (!student) {
    return res.status(400).json({
      message: "Student not found.",
    });
  }

  const date = toDateKey(req.body.timestamp);
  const time = toTimeString(req.body.timestamp);
  if (!date || !time) {
    return res.status(400).json({
      message: "Invalid timestamp.",
    });
  }

  const existing = await Attendance.findOne({ date, studentId: student._id });
  if (!existing || !existing.checkInTime) {
    return res.status(400).json({
      message: "Student has not checked in yet for this date.",
    });
  }

  await Attendance.updateOne(
    { date, studentId: student._id },
    { checkOutTime: time }
  );

  const refreshed = await Attendance.findOne({ date, studentId: student._id });
  if (!refreshed) {
    return res.status(400).json({
      message: "Unable to update check-out.",
    });
  }

  return res.status(200).json({
    message: "Check-out saved successfully!!!",
    data: toPublicAttendance(refreshed, student.studentId),
  });
};

const daily = async (req, res) => {
  const date = toDateKey(req.query.date);
  if (!date) {
    return res.status(400).json({
      message: "Invalid date.",
    });
  }

  const students = await Student.find({});
  const rows = [];

  for (const student of students) {
    const found = await Attendance.findOne({ date, studentId: student._id });

    if (!found || !found.checkInTime) {
      rows.push({
        date,
        studentId: student.studentId,
        studentName: student.fullName,
        level: student.level,
        checkInTime: null,
        checkOutTime: null,
        status: "Absent",
        isLate: false,
      });
      continue;
    }

    rows.push({
      date,
      studentId: student.studentId,
      studentName: student.fullName,
      level: student.level,
      checkInTime: found.checkInTime,
      checkOutTime: found.checkOutTime,
      status: found.status,
      isLate: found.isLate,
    });
  }

  const summary = rows.reduce(
    (acc, row) => {
      if (row.status === "Absent") {
        acc.absent += 1;
      } else {
        acc.present += 1;
      }

      if (row.isLate) {
        acc.late += 1;
      }

      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );

  return res.status(200).json({
    message: "Daily report fetched successfully!!!",
    data: {
      date,
      summary,
      rows,
    },
  });
};

module.exports = {
  checkIn,
  checkOut,
  daily,
};
