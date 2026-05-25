const crypto = require("crypto");

const hash = async (text) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(String(text || ""), salt, 64).toString("hex");
  return `${salt}:${digest}`;
};

const compare = async (plain, hashed) => {
  if (!hashed || !String(hashed).includes(":")) {
    return false;
  }

  const [salt, oldDigest] = String(hashed).split(":");
  const newDigest = crypto.scryptSync(String(plain || ""), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(oldDigest, "hex"), Buffer.from(newDigest, "hex"));
};

module.exports = {
  hash,
  compare,
};
