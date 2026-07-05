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

// Routes
import authRoutes from './routes/auth.routes';
import jobsRoutes from './routes/jobs.routes';
import queuesRoutes from './routes/queues.routes';
import projectsRoutes from './routes/projects.routes';
import workersRoutes from './routes/workers.routes';

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time updates
const io = new Server(server, {
  cors: config.cors,
});
socketService.init(io);

// Middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// Health check
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

// WebSocket events
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('subscribe:queue', (queueId: string) => {
    socket.join(`queue:${queueId}`);
    logger.debug('Client subscribed to queue', { queueId, socketId: socket.id });
  });

  socket.on('unsubscribe:queue', (queueId: string) => {
    socket.leave(`queue:${queueId}`);
    logger.debug('Client unsubscribed from queue', { queueId, socketId: socket.id });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Export io for use in other modules
export { io };

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${config.env}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
