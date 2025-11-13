import mongoose from 'mongoose';
import { logger } from './logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    // Ensure MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Remove any extra whitespace from the connection string
    const mongoUri = process.env.MONGODB_URI.trim();
    
    // Add connection options for better stability
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    };

    await mongoose.connect(mongoUri, options);
    logger.info('✅ Connected to MongoDB');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('⚠️  Continuing without database (development mode)');
    }
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  logger.error('❌ MongoDB error:', error);
});

