import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../api/routes/auth.routes';
import queuesRoutes from '../api/routes/queues.routes';
import { errorHandler } from '../middleware/errorHandler';

// Mock Prisma
jest.mock('@prisma/client', () => {
    const mPrisma = {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        organization: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        project: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        queue: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        queueStats: {
            create: jest.fn(),
        },
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('../middleware/auth', () => ({
    authenticate: (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/queues', queuesRoutes);
app.use(errorHandler);

const prisma = new PrismaClient() as any;

describe('Job Scheduler API Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Health API', () => {
        it('should return 200 healthy status', async () => {
            app.get('/health', (_req, res) => {
                res.json({ status: 'healthy' });
            });

            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('healthy');
        });
    });

    describe('Auth Routes', () => {
        it('should reject invalid credentials', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nonexistent@example.com', password: 'password123' });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Invalid credentials');
        });
    });

    describe('Queue Routes', () => {
        it('should create a queue with a non-UUID project id by creating a default project', async () => {
            prisma.organization.findFirst.mockResolvedValue(null);
            prisma.organization.create.mockResolvedValue({ id: 'org-1' });
            prisma.project.findFirst.mockResolvedValue(null);
            prisma.project.create.mockResolvedValue({ id: 'proj-1' });
            prisma.queue.create.mockResolvedValue({ id: 'queue-1' });

            const response = await request(app)
                .post('/api/queues')
                .send({
                    projectId: 'default-project',
                    name: 'email',
                    description: 'email work',
                    priority: 5,
                    concurrencyLimit: 10,
                    rateLimit: 100,
                });

            expect(response.status).toBe(201);
            expect(prisma.organization.create).toHaveBeenCalled();
            expect(prisma.project.create).toHaveBeenCalled();
            expect(prisma.queue.create).toHaveBeenCalled();
        });
    });
});
