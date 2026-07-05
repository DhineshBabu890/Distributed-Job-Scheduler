import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import http from 'http';
import config from '../config';
import logger from '../utils/logger';
import { errorHandler, notFound } from '../middleware/errorHandler';
import socketService from '../services/socketService';
import JobWorker from '../workers/worker';

// Routes
import authRoutes from './routes/auth.routes';
import jobsRoutes from './routes/jobs.routes';
import queuesRoutes from './routes/queues.routes';
import projectsRoutes from './routes/projects.routes';
import workersRoutes from './routes/workers.routes';

const app = express();
const server = http.createServer(app);

// WebSocket server
const io = new Server(server, {
  cors: config.cors,
});

socketService.init(io);

// Middleware
// Middleware

console.log("================================");
console.log("ENV CORS_ORIGIN =", process.env.CORS_ORIGIN);
console.log("CONFIG CORS =", config.cors);
console.log("================================");

app.use(helmet());
app.use(cors(config.cors));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Rate Limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api', limiter);

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/queues', queuesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/workers', workersRoutes);

// WebSocket Events
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('subscribe:queue', (queueId: string) => {
    socket.join(`queue:${queueId}`);
  });

  socket.on('unsubscribe:queue', (queueId: string) => {
    socket.leave(`queue:${queueId}`);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', {
      socketId: socket.id,
    });
  });
});

// Export io
export { io };

// Error Handlers
app.use(notFound);
app.use(errorHandler);

// ===============================
// START SERVER + WORKER
// ===============================

const PORT = config.port;

server.listen(PORT, async () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${config.env}`);

  try {
    const raw = process.env.WORKER_QUEUES?.trim();

    const queueIds = raw
      ? raw.split(',').map((q) => q.trim()).filter(Boolean)
      : [];

    const worker = new JobWorker(queueIds);

    await worker.start();

    logger.info('Background Worker Started Successfully');
  } catch (error) {
    logger.error('Failed to start worker', error);
  }
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');

  server.close(() => {
    logger.info('HTTP Server Closed');
    process.exit(0);
  });
});

export default app;