import express, { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validate } from '../../middleware/validation';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

type QueueRequest = AuthRequest & {
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: any;
};

const createQueueSchema = z.object({
  body: z.object({
    projectId: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    priority: z.number().int().min(0).max(10).optional(),
    concurrencyLimit: z.number().int().min(1).max(100).optional(),
    rateLimit: z.number().int().min(1).optional(),
    retryPolicyId: z.string().uuid().optional(),
  }),
});

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const resolveOrCreateProjectId = async (requestedProjectId?: string) => {
  const rawProjectId = requestedProjectId?.trim();

  if (rawProjectId && isUuid(rawProjectId)) {
    const existingProject = await prisma.project.findUnique({ where: { id: rawProjectId } });
    if (existingProject) {
      return existingProject.id;
    }
  }

  const defaultOrgSlug = 'default-organization';
  let organization = await prisma.organization.findFirst({ where: { slug: defaultOrgSlug } });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Default Organization',
        slug: defaultOrgSlug,
      },
    });
  }

  let project = await prisma.project.findFirst({
    where: {
      organizationId: organization.id,
      name: 'Default Project',
    },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Default Project',
        description: 'Auto-created project for queue creation',
      },
    });
  }

  return project.id;
};

const updateQueueSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    priority: z.number().int().min(0).max(10).optional(),
    concurrencyLimit: z.number().int().min(1).max(100).optional(),
    rateLimit: z.number().int().min(1).optional(),
    isPaused: z.boolean().optional(),
    retryPolicyId: z.string().uuid().optional(),
  }),
});

router.post(
  '/',
  authenticate,
  validate(createQueueSchema),
  async (req: QueueRequest, res: Response, next: NextFunction) => {
    try {
      const resolvedProjectId = await resolveOrCreateProjectId(req.body.projectId);
      const queue = await prisma.queue.create({
        data: {
          ...req.body,
          projectId: resolvedProjectId,
        },
        include: {
          project: true,
          retryPolicy: true,
        },
      });

      res.status(201).json({ queue });
    } catch (error: any) {
      if (error.code === 'P2002') {
        next(new AppError('Queue name already exists in this project', 400));
      } else {
        next(error);
      }
    }
  }
);

router.get('/', authenticate, async (req: QueueRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.query;

    const queues = await prisma.queue.findMany({
      where: projectId ? { projectId: projectId as string } : undefined,
      include: {
        project: { select: { id: true, name: true } },
        retryPolicy: true,
        statistics: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ queues });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: QueueRequest, res: Response, next: NextFunction) => {
  try {
    const queue = await prisma.queue.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        retryPolicy: true,
        statistics: true,
      },
    });

    if (!queue) {
      throw new AppError('Queue not found', 404);
    }

    res.json({ queue });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:id',
  authenticate,
  validate(updateQueueSchema),
  async (req: QueueRequest, res: Response, next: NextFunction) => {
    try {
      const queue = await prisma.queue.update({
        where: { id: req.params.id },
        data: req.body,
        include: {
          project: true,
          retryPolicy: true,
          statistics: true,
        },
      });

      res.json({ queue });
    } catch (error: any) {
      if (error.code === 'P2025') {
        next(new AppError('Queue not found', 404));
      } else {
        next(error);
      }
    }
  }
);

router.delete('/:id', authenticate, async (req: QueueRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.queue.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Queue deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      next(new AppError('Queue not found', 404));
    } else {
      next(error);
    }
  }
});

router.post('/:id/pause', authenticate, async (req: QueueRequest, res: Response, next: NextFunction) => {
  try {
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: { isPaused: true },
    });

    res.json({ queue, message: 'Queue paused' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resume', authenticate, async (req: QueueRequest, res: Response, next: NextFunction) => {
  try {
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: { isPaused: false },
    });

    res.json({ queue, message: 'Queue resumed' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/stats', authenticate, async (req: QueueRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await prisma.queueStats.findUnique({
      where: { queueId: req.params.id },
    });

    if (!stats) {
      throw new AppError('Queue statistics not found', 404);
    }

    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

export default router;
