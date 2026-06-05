const nodemailer = require("nodemailer");

let transporter = null;

const createTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in .env");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

const sendMail = async (to, subject, body) => {
  const from = process.env.SMTP_FROM;
  if (!from) {
    throw new Error("SMTP_FROM is missing in .env");
  }

  const mailer = createTransporter();
  await mailer.sendMail({
    from,
    to,
    subject,
    text: body,
  });

  return true;
};

module.exports = {
  sendMail,
};
