import { PrismaClient, WorkerStatus } from '@prisma/client';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import jobService from '../services/jobService';

const prisma = new PrismaClient();

export class JobWorker {
  private workerId: string;
  private isRunning: boolean = false;
  private isShuttingDown: boolean = false;
  private currentJobs: Set<string> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private queues: string[] = [];

  constructor(queues: string[]) {
    this.workerId = uuidv4();
    this.queues = queues;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker already running');
      return;
    }

    logger.info('Starting worker', {
      workerId: this.workerId,
      hostname: os.hostname(),
      pid: process.pid,
      queues: this.queues,
    });

    // Register worker
    await prisma.worker.create({
      data: {
        id: this.workerId,
        name: `worker-${os.hostname()}-${process.pid}`,
        hostname: os.hostname(),
        pid: process.pid,
        status: WorkerStatus.IDLE,
        maxConcurrency: config.worker.concurrency,
        currentJobs: 0,
        queues: this.queues,
        metadata: {
          nodeVersion: process.version,
          platform: process.platform,
        },
      },
    });

    this.isRunning = true;

    // Start heartbeat
    this.startHeartbeat();

    // Start polling for jobs
    this.startPolling();

    // Handle graceful shutdown
    this.setupShutdownHandlers();

    logger.info('Worker started successfully', { workerId: this.workerId });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const cpuUsage = process.cpuUsage();
        const memoryUsage = process.memoryUsage();

        await prisma.worker.update({
          where: { id: this.workerId },
          data: {
            lastHeartbeat: new Date(),
            currentJobs: this.currentJobs.size,
            status:
              this.currentJobs.size === 0
                ? WorkerStatus.IDLE
                : WorkerStatus.BUSY,
          },
        });

        await prisma.workerHeartbeat.create({
          data: {
            workerId: this.workerId,
            cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000,
            memoryUsage: memoryUsage.heapUsed / 1024 / 1024,
            jobsRunning: this.currentJobs.size,
          },
        });

        logger.debug('Heartbeat sent', {
          workerId: this.workerId,
          jobsRunning: this.currentJobs.size,
        });
      } catch (error) {
        logger.error('Failed to send heartbeat', { error, workerId: this.workerId });
      }
    }, config.worker.heartbeatInterval);
  }

  private startPolling(): void {
    this.pollInterval = setInterval(async () => {
      if (this.isShuttingDown) {
        return;
      }

      // Check if we can accept more jobs
      if (this.currentJobs.size >= config.worker.concurrency) {
        return;
      }

      try {
        // Claim a job
        const job = await jobService.claimJob(this.workerId, this.queues);

        if (job) {
          this.executeJob(job.id);
        }
      } catch (error) {
        logger.error('Error polling for jobs', { error, workerId: this.workerId });
      }
    }, config.worker.pollInterval);
  }

  private async executeJob(jobId: string): Promise<void> {
    this.currentJobs.add(jobId);

    try {
      logger.info('Executing job', { jobId, workerId: this.workerId });

      // Mark job as running
      await jobService.markJobRunning(jobId);

      // Get job details
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      // Add log
      await jobService.addJobLog(
        jobId,
        'INFO',
        `Job execution started by worker ${this.workerId}`
      );

      // Execute job with timeout
      const startTime = Date.now();
      const result = await this.runJobWithTimeout(job.payload, job.timeout);
      const duration = Date.now() - startTime;

      // Update execution duration
      await prisma.jobExecution.updateMany({
        where: {
          jobId,
          status: 'STARTED',
        },
        data: {
          duration,
        },
      });

      // Mark as completed
      await jobService.markJobCompleted(jobId, result);

      await jobService.addJobLog(
        jobId,
        'INFO',
        `Job completed successfully in ${duration}ms`
      );

      logger.info('Job completed', { jobId, duration });
    } catch (error: any) {
      logger.error('Job execution failed', {
        jobId,
        error: error.message,
        stack: error.stack,
      });

      await jobService.markJobFailed(jobId, {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      await jobService.addJobLog(
        jobId,
        'ERROR',
        `Job execution failed: ${error.message}`,
        { stack: error.stack }
      );
    } finally {
      this.currentJobs.delete(jobId);
    }
  }

  private async runJobWithTimeout(payload: any, timeout: number): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Job execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        // Execute the actual job logic
        const result = await this.executeJobLogic(payload);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private async executeJobLogic(payload: any): Promise<any> {
    // This is where you implement the actual job execution logic
    // For demo purposes, we'll simulate different types of jobs

    logger.debug('Executing job logic', { payload });

    const { type, data, delay } = payload;

    // Simulate processing time
    if (delay) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    switch (type) {
      case 'email':
        return this.sendEmail(data);
      case 'data-processing':
        return this.processData(data);
      case 'api-call':
        return this.makeApiCall(data);
      case 'report-generation':
        return this.generateReport(data);
      default:
        return { success: true, message: 'Job executed', data };
    }
  }

  private async sendEmail(data: any): Promise<any> {
    logger.info('Sending email', { to: data.to, subject: data.subject });
    // Implement email sending logic
    return { success: true, emailId: uuidv4(), sentAt: new Date() };
  }

  private async processData(data: any): Promise<any> {
    logger.info('Processing data', { recordCount: data.records?.length });
    // Implement data processing logic
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { success: true, processedRecords: data.records?.length || 0 };
  }

  private async makeApiCall(data: any): Promise<any> {
    logger.info('Making API call', { url: data.url });
    // Implement API call logic
    return { success: true, statusCode: 200, response: { message: 'API call successful' } };
  }

  private async generateReport(data: any): Promise<any> {
    logger.info('Generating report', { reportType: data.reportType });
    // Implement report generation logic
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { success: true, reportId: uuidv4(), reportUrl: '/reports/example.pdf' };
  }

  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }

      logger.info('Shutdown signal received', { signal, workerId: this.workerId });
      this.isShuttingDown = true;

      // Update worker status
      await prisma.worker.update({
        where: { id: this.workerId },
        data: { status: WorkerStatus.SHUTTING_DOWN },
      });

      // Stop polling for new jobs
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }

      // Wait for current jobs to complete
      logger.info('Waiting for jobs to complete', {
        pendingJobs: this.currentJobs.size,
      });

      while (this.currentJobs.size > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Mark worker as stopped
      await prisma.worker.update({
        where: { id: this.workerId },
        data: {
          status: WorkerStatus.STOPPED,
          stoppedAt: new Date(),
        },
      });

      logger.info('Worker stopped gracefully', { workerId: this.workerId });
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  async stop(): Promise<void> {
    await this.setupShutdownHandlers();
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  // If WORKER_QUEUES is empty or not set, worker watches ALL queues
  const raw = process.env.WORKER_QUEUES?.trim();
  const queueIds = raw ? raw.split(',').map(q => q.trim()).filter(Boolean) : [];

  if (queueIds.length === 0) {
    logger.info('No specific queues configured — worker will process jobs from ALL queues');
  } else {
    logger.info(`Worker restricted to queues: ${queueIds.join(', ')}`);
  }

  const worker = new JobWorker(queueIds);
  worker.start().catch((error) => {
    logger.error('Failed to start worker', { error });
    process.exit(1);
  });
}

export default JobWorker;
