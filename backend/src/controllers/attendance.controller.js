const attendanceService = require("../services/attendance.service");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const DEFAULT_LATE_CUTOFF = "13:00";

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

const isLateTime = (time24, lateCutoff = DEFAULT_LATE_CUTOFF) => {
  if (!time24) {
    return false;
  }

  return time24 > lateCutoff;
};

const toMonthKey = (monthInput) => {
  if (!monthInput) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const monthKey = String(monthInput).trim();
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  return monthKey;
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

  const late = isLateTime(time, req.body.lateCutoff || DEFAULT_LATE_CUTOFF);

  if (existing) {
    await Attendance.updateOne(
      { date, studentId: student._id },
      {
        checkInTime: time,
        status: late ? "Late" : "On-time",
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
    status: late ? "Late" : "On-time",
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
        profileImage: student.profileImage || "",
        level: student.level,
        department: student.department || "N/A",
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
      profileImage: student.profileImage || "",
      level: student.level,
      department: student.department || "N/A",
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
        acc.onTime += 1;
      }

      if (row.isLate) {
        acc.late += 1;
      }

      return acc;
    },
    { onTime: 0, absent: 0, late: 0 }
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

const monthly = async (req, res) => {
  const monthKey = toMonthKey(req.query.month);
  if (!monthKey) {
    return res.status(400).json({
      message: "Invalid month. Use YYYY-MM format.",
    });
  }

  const student = await Student.findOne({ studentId: req.query.studentId });
  if (!student) {
    return res.status(404).json({
      message: "Student not found.",
    });
  }

  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const endDay = String(new Date(year, month, 0).getDate()).padStart(2, "0");
  const fromDate = `${monthKey}-01`;
  const toDate = `${monthKey}-${endDay}`;

  const records = await Attendance.find({
    studentId: student._id,
    date: {
      $gte: fromDate,
      $lte: toDate,
    },
  }).sort({ date: 1 });

  const rows = records.map((record) => ({
    date: record.date,
    studentId: student.studentId,
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime,
    status: record.status,
    isLate: record.isLate,
  }));

  return res.status(200).json({
    message: "Monthly report fetched successfully!!!",
    data: {
      month: monthKey,
      studentId: student.studentId,
      rows,
    },
  });
};

module.exports = {
  checkIn,
  checkOut,
  daily,
  monthly,
};
