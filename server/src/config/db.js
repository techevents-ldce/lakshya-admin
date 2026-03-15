const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('MongoDB connected successfully');
      return;
    } catch (err) {
      retries -= 1;
      logger.error(`MongoDB connection failed. Retries left: ${retries}`, { error: err.message });
      if (!retries) throw err;
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
};

module.exports = connectDB;
