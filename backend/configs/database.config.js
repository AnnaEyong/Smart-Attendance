const mongoose = require("mongoose");

const connect = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required in .env");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected successfully");
};

module.exports = {
  connect,
};
