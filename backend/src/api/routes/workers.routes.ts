import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (_req: AuthRequest, res, next) => {
    try {
        const workers = await prisma.worker.findMany({
            include: {
                heartbeats: {
                    orderBy: { timestamp: 'desc' },
                    take: 10,
                },
            },
            orderBy: { lastHeartbeat: 'desc' },
        });
        res.json({ workers });
    } catch (error) {
        next(error);
    }
});

export default router;
