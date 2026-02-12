import mongoose from 'mongoose';
import logger from './logger.js';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      logger.error('MONGODB_URI not found in .env file');
      process.exit(1);
    }

    await mongoose.connect(uri);
    logger.info('✅ MongoDB connected successfully');
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', { error });
    process.exit(1);
  }
};
