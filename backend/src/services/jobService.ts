import { PrismaClient, Job, JobStatus, JobType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import cronParser from 'cron-parser';
import logger from '../utils/logger';
import socketService from './socketService';

const prisma = new PrismaClient();

export interface CreateJobDto {
  queueId: string;
  createdBy: string;
  name: string;
  type: JobType;
  payload: any;
  priority?: number;
  maxAttempts?: number;
  scheduledFor?: Date;
  cronExpression?: string;
  timeout?: number;
  idempotencyKey?: string;
  parentJobId?: string;
}

export class JobService {
  async createJob(data: CreateJobDto): Promise<Job> {
    // Validate queue exists and is active
    const queue = await prisma.queue.findFirst({
      where: { id: data.queueId, isActive: true },
    });

    if (!queue) {
      throw new Error('Queue not found or inactive');
    }

    // Check idempotency
    if (data.idempotencyKey) {
      const existing = await prisma.job.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    // Calculate next run time for recurring jobs
    let nextRunAt: Date | undefined;
    if (data.type === JobType.RECURRING && data.cronExpression) {
      const interval = cronParser.parseExpression(data.cronExpression);
      nextRunAt = interval.next().toDate();
    } else if (data.type === JobType.DELAYED && data.scheduledFor) {
      nextRunAt = data.scheduledFor;
    } else if (data.type === JobType.IMMEDIATE) {
      nextRunAt = new Date();
    }

    const job = await prisma.job.create({
      data: {
        queueId: data.queueId,
        createdBy: data.createdBy,
        name: data.name,
        type: data.type,
        status: data.type === JobType.IMMEDIATE ? JobStatus.QUEUED : JobStatus.SCHEDULED,
        payload: data.payload,
        priority: data.priority ?? queue.priority,
        maxAttempts: data.maxAttempts ?? 3,
        scheduledFor: data.scheduledFor,
        cronExpression: data.cronExpression,
        nextRunAt,
        timeout: data.timeout ?? 300000,
        idempotencyKey: data.idempotencyKey,
        parentJobId: data.parentJobId,
        retryPolicyId: queue.retryPolicyId,
      },
      include: {
        queue: true,
        retryPolicy: true,
      },
    });

    // Update queue statistics
    await this.updateQueueStats(queue.id);

    logger.info('Job created', { jobId: job.id, type: job.type, queueId: job.queueId });
    socketService.emit('job:update', { jobId: job.id, status: job.status, queueId: job.queueId });

    return job;
  }

  async claimJob(workerId: string, queueIds: string[]): Promise<Job | null> {
    // Use PostgreSQL row-level locking to atomically claim a job
    // If queueIds is empty, watch ALL queues (no filter applied)
    const job = queueIds.length > 0
      ? await prisma.$queryRaw<Job[]>`
          UPDATE jobs
          SET status = 'CLAIMED'::"JobStatus",
              "updatedAt" = NOW()
          WHERE id = (
            SELECT j.id FROM jobs j
            JOIN queues q ON j."queueId" = q.id
            LEFT JOIN (
              SELECT "queueId", COUNT(*) as active_count
              FROM jobs
              WHERE status IN ('CLAIMED'::"JobStatus", 'RUNNING'::"JobStatus")
              GROUP BY "queueId"
            ) active ON q.id = active."queueId"
            WHERE j."queueId" = ANY(${queueIds}::text[])
              AND j.status = 'QUEUED'::"JobStatus"
              AND (j."nextRunAt" IS NULL OR j."nextRunAt" <= NOW())
              AND q."isPaused" = false
              AND q."isActive" = true
              AND COALESCE(active.active_count, 0) < q."concurrencyLimit"
            ORDER BY j.priority DESC, j."createdAt" ASC
            FOR UPDATE OF j SKIP LOCKED
            LIMIT 1
          )
          RETURNING *
        `
      : await prisma.$queryRaw<Job[]>`
          UPDATE jobs
          SET status = 'CLAIMED'::"JobStatus",
              "updatedAt" = NOW()
          WHERE id = (
            SELECT j.id FROM jobs j
            JOIN queues q ON j."queueId" = q.id
            LEFT JOIN (
              SELECT "queueId", COUNT(*) as active_count
              FROM jobs
              WHERE status IN ('CLAIMED'::"JobStatus", 'RUNNING'::"JobStatus")
              GROUP BY "queueId"
            ) active ON q.id = active."queueId"
            WHERE j.status = 'QUEUED'::"JobStatus"
              AND (j."nextRunAt" IS NULL OR j."nextRunAt" <= NOW())
              AND q."isPaused" = false
              AND q."isActive" = true
              AND COALESCE(active.active_count, 0) < q."concurrencyLimit"
            ORDER BY j.priority DESC, j."createdAt" ASC
            FOR UPDATE OF j SKIP LOCKED
            LIMIT 1
          )
          RETURNING *
        `;

    if (job.length === 0) {
      return null;
    }

    const claimedJob = job[0];

    // Create execution record
    await prisma.jobExecution.create({
      data: {
        jobId: claimedJob.id,
        workerId,
        attempt: claimedJob.attempt + 1,
        status: 'STARTED',
      },
    });

    logger.info('Job claimed', { jobId: claimedJob.id, workerId });
    socketService.emit('job:update', { jobId: claimedJob.id, status: 'CLAIMED', queueId: claimedJob.queueId });

    return claimedJob;
  }

  async markJobRunning(jobId: string): Promise<void> {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
        attempt: { increment: 1 },
      },
    });
    socketService.emit('job:update', { jobId, status: JobStatus.RUNNING, queueId: job.queueId });
  }

  async markJobCompleted(jobId: string, result: any): Promise<void> {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        result,
        completedAt: new Date(),
      },
      include: { queue: true },
    });

    // Update execution record
    await prisma.jobExecution.updateMany({
      where: {
        jobId,
        status: 'STARTED',
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        output: result,
      },
    });

    // Handle recurring jobs
    if (job.type === JobType.RECURRING && job.cronExpression) {
      const interval = cronParser.parseExpression(job.cronExpression);
      const nextRunAt = interval.next().toDate();

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.SCHEDULED,
          nextRunAt,
          attempt: 0,
        },
      });
    }

    await this.updateQueueStats(job.queueId);
    logger.info('Job completed', { jobId });
    socketService.emit('job:update', { jobId, status: job.status, queueId: job.queueId });
  }

  async markJobFailed(jobId: string, error: any): Promise<void> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { queue: true, retryPolicy: true },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // Update execution record
    await prisma.jobExecution.updateMany({
      where: {
        jobId,
        status: 'STARTED',
      },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error,
      },
    });

    // Check if job should be retried
    if (job.attempt < job.maxAttempts) {
      const retryDelay = this.calculateRetryDelay(job);
      const nextRunAt = new Date(Date.now() + retryDelay);

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.QUEUED,
          error,
          nextRunAt,
          failedAt: new Date(),
        },
      });

      logger.info('Job scheduled for retry', {
        jobId,
        attempt: job.attempt,
        nextRunAt,
      });
    } else {
      // Move to dead letter queue
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.DEAD_LETTER,
          error,
          failedAt: new Date(),
        },
      });

      await prisma.deadLetterQueue.create({
        data: {
          jobId,
          reason: 'Max retry attempts exceeded',
          attempts: job.attempt,
          lastError: error,
        },
      });

      logger.warn('Job moved to dead letter queue', { jobId });
    }

    await this.updateQueueStats(job.queueId);
    const updatedJob = await prisma.job.findUnique({ where: { id: jobId } });
    if (updatedJob) {
      socketService.emit('job:update', { jobId, status: updatedJob.status, queueId: updatedJob.queueId });
    }
  }

  private calculateRetryDelay(job: Job & { retryPolicy: any }): number {
    if (!job.retryPolicy) {
      return 5000; // Default 5 seconds
    }

    const { strategy, initialDelayMs, maxDelayMs, backoffMultiplier } = job.retryPolicy;
    let delay: number;

    switch (strategy) {
      case 'FIXED_DELAY':
        delay = initialDelayMs;
        break;
      case 'LINEAR_BACKOFF':
        delay = initialDelayMs * (job.attempt + 1);
        break;
      case 'EXPONENTIAL_BACKOFF':
        delay = initialDelayMs * Math.pow(backoffMultiplier, job.attempt);
        break;
      default:
        delay = initialDelayMs;
    }

    return Math.min(delay, maxDelayMs);
  }

  async getJobById(jobId: string): Promise<Job | null> {
    return prisma.job.findUnique({
      where: { id: jobId },
      include: {
        queue: true,
        creator: { select: { id: true, email: true, firstName: true, lastName: true } },
        executions: { orderBy: { startedAt: 'desc' } },
        logs: { orderBy: { timestamp: 'desc' } },
        dlqEntry: true,
      },
    });
  }

  async listJobs(filters: {
    queueId?: string;
    status?: JobStatus;
    type?: JobType;
    page?: number;
    limit?: number;
  }) {
    const { queueId, status, type, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (queueId) where.queueId = queueId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          queue: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async retryJob(jobId: string): Promise<Job> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== JobStatus.FAILED && job.status !== JobStatus.DEAD_LETTER) {
      throw new Error('Only failed or dead letter jobs can be retried');
    }

    // Remove from DLQ if present
    await prisma.deadLetterQueue.deleteMany({
      where: { jobId },
    });

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.QUEUED,
        attempt: 0,
        error: undefined,
        nextRunAt: new Date(),
      },
    });

    socketService.emit('job:update', { jobId, status: 'QUEUED', queueId: updatedJob.queueId });
    return updatedJob;
  }

  async cancelJob(jobId: string): Promise<Job> {
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.CANCELLED,
      },
    });
    socketService.emit('job:update', { jobId, status: 'CANCELLED', queueId: updatedJob.queueId });
    return updatedJob;
  }

  private async updateQueueStats(queueId: string): Promise<void> {
    const stats = await prisma.job.groupBy({
      by: ['status'],
      where: { queueId },
      _count: { status: true },
    });

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    const avgExecution = await prisma.jobExecution.aggregate({
      where: {
        job: { queueId },
        status: 'COMPLETED',
        duration: { not: null },
      },
      _avg: { duration: true },
    });

    const lastJob = await prisma.job.findFirst({
      where: { queueId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    await prisma.queueStats.upsert({
      where: { queueId },
      create: {
        queueId,
        totalJobs: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        queuedJobs: statusCounts[JobStatus.QUEUED] || 0,
        runningJobs: statusCounts[JobStatus.RUNNING] || 0,
        completedJobs: statusCounts[JobStatus.COMPLETED] || 0,
        failedJobs: statusCounts[JobStatus.FAILED] || 0,
        avgExecutionMs: avgExecution._avg.duration || 0,
        lastJobAt: lastJob?.createdAt,
      },
      update: {
        totalJobs: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        queuedJobs: statusCounts[JobStatus.QUEUED] || 0,
        runningJobs: statusCounts[JobStatus.RUNNING] || 0,
        completedJobs: statusCounts[JobStatus.COMPLETED] || 0,
        failedJobs: statusCounts[JobStatus.FAILED] || 0,
        avgExecutionMs: avgExecution._avg.duration || 0,
        lastJobAt: lastJob?.createdAt,
      },
    });
  }

  async addJobLog(
    jobId: string,
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
    message: string,
    metadata?: any
  ): Promise<void> {
    await prisma.jobLog.create({
      data: {
        jobId,
        level,
        message,
        metadata,
      },
    });
  }
}

export default new JobService();
