import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/job_scheduler',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-this',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    pollInterval: parseInt(process.env.WORKER_POLL_INTERVAL || '1000', 10),
    heartbeatInterval: parseInt(process.env.WORKER_HEARTBEAT_INTERVAL || '5000', 10),
    staleJobTimeout: parseInt(process.env.WORKER_STALE_JOB_TIMEOUT || '300000', 10), // 5 minutes
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per windowMs
  },
};

export default config;
