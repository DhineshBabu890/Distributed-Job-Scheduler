import express from 'express';
import { z } from 'zod';
import { JobType, JobStatus } from '@prisma/client';
import { validate } from '../../middleware/validation';
import { authenticate, AuthRequest } from '../../middleware/auth';
import jobService from '../../services/jobService';
import { AppError } from '../../middleware/errorHandler';

const router = express.Router();

const createJobSchema = z.object({
  body: z.object({
    queueId: z.string().uuid(),
    name: z.string().min(1),
    type: z.nativeEnum(JobType),
    payload: z.any(),
    priority: z.number().int().min(0).max(10).optional(),
    maxAttempts: z.number().int().min(1).max(10).optional(),
    scheduledFor: z.string().datetime().optional(),
    cronExpression: z.string().optional(),
    timeout: z.number().int().min(1000).optional(),
    idempotencyKey: z.string().optional(),
    parentJobId: z.string().uuid().optional(),
  }),
});

const listJobsSchema = z.object({
  query: z.object({
    queueId: z.string().uuid().optional(),
    status: z.nativeEnum(JobStatus).optional(),
    type: z.nativeEnum(JobType).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

router.post(
  '/',
  authenticate,
  validate(createJobSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const jobData = {
        ...req.body,
        createdBy: req.user!.id,
        scheduledFor: req.body.scheduledFor
          ? new Date(req.body.scheduledFor)
          : undefined,
      };

      const job = await jobService.createJob(jobData);

      res.status(201).json({ job });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  authenticate,
  validate(listJobsSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await jobService.listJobs(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id);

    if (!job) {
      throw new AppError('Job not found', 404);
    }

    res.json({ job });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/retry', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const job = await jobService.retryJob(req.params.id);
    res.json({ job, message: 'Job queued for retry' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const job = await jobService.cancelJob(req.params.id);
    res.json({ job, message: 'Job cancelled' });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/batch',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const { jobs } = req.body;

      if (!Array.isArray(jobs)) {
        throw new AppError('jobs must be an array', 400);
      }

      const createdJobs = await Promise.all(
        jobs.map((jobData) =>
          jobService.createJob({
            ...jobData,
            createdBy: req.user!.id,
            type: JobType.BATCH,
          })
        )
      );

      res.status(201).json({
        jobs: createdJobs,
        count: createdJobs.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
