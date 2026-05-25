const crypto = require("crypto");

const toBase64Url = (value) => {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
};

const signRaw = (payloadPart, secret) => {
  return crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
};

const sign = (payload) => {
  const secret = process.env.JWT_SECRET || "smart-attendance-secret";
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const payloadPart = toBase64Url(JSON.stringify({ ...payload, exp }));
  const signature = signRaw(payloadPart, secret);
  return `${payloadPart}.${signature}`;
};

const verify = (token) => {
  try {
    const secret = process.env.JWT_SECRET || "smart-attendance-secret";
    const [payloadPart, signature] = String(token || "").split(".");
    if (!payloadPart || !signature) {
      return null;
    }

    const expectedSignature = signRaw(payloadPart, secret);
    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(fromBase64Url(payloadPart));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
};

module.exports = {
  sign,
  verify,
};
