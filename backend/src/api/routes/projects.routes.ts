import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

export default router;
