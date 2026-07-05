# Database Schema Documentation

## Overview

The database schema is designed for a multi-tenant distributed job scheduling system with comprehensive audit trails, worker management, and job lifecycle tracking.

## ER Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌──────────────────────┐      ┌──────────────┐
│ OrganizationMember   │──────│ Organization │
└──────────────────────┘  N:1 └──────┬───────┘
                                     │ 1:N
                                     ▼
                              ┌──────────────┐
                              │   Project    │
                              └──────┬───────┘
                                     │ 1:N
                                     ▼
                              ┌──────────────┐
                              │    Queue     │◄───────┐
                              └──────┬───────┘        │
                                     │ 1:N            │
                                     ▼                │
                              ┌──────────────┐        │
                              │     Job      │        │
                              └──────┬───────┘        │
                                     │ 1:N            │
                                     ▼                │
                           ┌──────────────────┐       │
                           │  JobExecution    │       │
                           └──────────────────┘       │
                                                      │
┌─────────────┐                                      │
│ RetryPolicy │──────────────────────────────────────┘
└─────────────┘

┌─────────────┐      ┌──────────────────┐
│   Worker    │──────│ WorkerHeartbeat  │
└─────────────┘ 1:N  └──────────────────┘
```

## Tables

### Users
Stores user authentication and profile information.

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'USER',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `email`: User email (unique, used for login)
- `password`: Bcrypt hashed password
- `first_name`, `last_name`: User profile info
- `role`: USER, ADMIN, SUPER_ADMIN
- `is_active`: Soft delete flag

**Indexes:**
- Primary key on `id`
- Unique index on `email`

### Organizations
Multi-tenant organization structure.

```sql
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
```

**Cascade Behavior:**
- Deleting an organization deletes all projects, queues, and jobs

### OrganizationMembers
Links users to organizations with roles.

```sql
CREATE TABLE organization_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role             VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
  joined_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
```

**Roles:**
- OWNER: Full control
- ADMIN: Manage members and resources
- MEMBER: Create and manage jobs
- VIEWER: Read-only access

### Projects
Organizational unit for grouping queues.

```sql
CREATE TABLE projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_org ON projects(organization_id);
```

### Queues
Job queues with configuration and policies.

```sql
CREATE TABLE queues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  priority          INTEGER DEFAULT 0,
  concurrency_limit INTEGER DEFAULT 10,
  rate_limit        INTEGER, -- Jobs per minute
  is_paused         BOOLEAN DEFAULT false,
  is_active         BOOLEAN DEFAULT true,
  retry_policy_id   UUID REFERENCES retry_policies(id),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE INDEX idx_queues_project ON queues(project_id);
CREATE INDEX idx_queues_status ON queues(is_paused, is_active);
```

**Configuration:**
- `priority`: 0-10 (higher = more important)
- `concurrency_limit`: Max concurrent jobs
- `rate_limit`: Jobs per minute throttle
- `is_paused`: Temporarily stop processing

### QueueStatistics
Aggregated metrics for each queue.

```sql
CREATE TABLE queue_statistics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id         UUID UNIQUE NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  total_jobs       INTEGER DEFAULT 0,
  queued_jobs      INTEGER DEFAULT 0,
  running_jobs     INTEGER DEFAULT 0,
  completed_jobs   INTEGER DEFAULT 0,
  failed_jobs      INTEGER DEFAULT 0,
  avg_execution_ms FLOAT DEFAULT 0,
  last_job_at      TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_queue_stats_queue ON queue_statistics(queue_id);
```

**Purpose:**
- Real-time dashboard metrics
- Updated after each job status change
- Prevents expensive aggregation queries

### RetryPolicies
Configurable retry strategies.

```sql
CREATE TABLE retry_policies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(100) UNIQUE NOT NULL,
  strategy             VARCHAR(50) NOT NULL, -- FIXED_DELAY, LINEAR_BACKOFF, EXPONENTIAL_BACKOFF
  max_attempts         INTEGER DEFAULT 3,
  initial_delay_ms     INTEGER DEFAULT 1000,
  max_delay_ms         INTEGER DEFAULT 60000,
  backoff_multiplier   FLOAT DEFAULT 2.0,
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW()
);
```

**Strategies:**
- `FIXED_DELAY`: Constant interval between retries
- `LINEAR_BACKOFF`: Delay increases linearly (delay × attempt)
- `EXPONENTIAL_BACKOFF`: Delay doubles each attempt

### Jobs
Core job entity with lifecycle tracking.

```sql
CREATE TABLE jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id          UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES users(id),
  name              VARCHAR(255) NOT NULL,
  type              VARCHAR(50) NOT NULL, -- IMMEDIATE, DELAYED, SCHEDULED, RECURRING, BATCH
  status            VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
  priority          INTEGER DEFAULT 0,
  payload           JSONB NOT NULL,
  result            JSONB,
  error             JSONB,
  max_attempts      INTEGER DEFAULT 3,
  attempt           INTEGER DEFAULT 0,
  retry_policy_id   UUID REFERENCES retry_policies(id),
  scheduled_for     TIMESTAMP,
  cron_expression   VARCHAR(100),
  next_run_at       TIMESTAMP,
  timeout           INTEGER DEFAULT 300000,
  idempotency_key   VARCHAR(255) UNIQUE,
  parent_job_id     UUID REFERENCES jobs(id),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  started_at        TIMESTAMP,
  completed_at      TIMESTAMP,
  failed_at         TIMESTAMP
);

-- Critical indexes for performance
CREATE INDEX idx_jobs_queue_status ON jobs(queue_id, status);
CREATE INDEX idx_jobs_status_scheduled ON jobs(status, scheduled_for);
CREATE INDEX idx_jobs_next_run ON jobs(next_run_at);
CREATE INDEX idx_jobs_creator ON jobs(created_by);
CREATE INDEX idx_jobs_idempotency ON jobs(idempotency_key);
CREATE INDEX idx_jobs_parent ON jobs(parent_job_id);
```

**Status Lifecycle:**
```
QUEUED → CLAIMED → RUNNING → COMPLETED
                      ↓
                   FAILED → (retry) → QUEUED
                      ↓
                  (max retries) → DEAD_LETTER
```

**Job Types:**
- `IMMEDIATE`: Execute ASAP
- `DELAYED`: Execute after scheduledFor
- `SCHEDULED`: One-time at specific time
- `RECURRING`: Repeat based on cron
- `BATCH`: Part of batch operation

**Key Features:**
- `idempotency_key`: Prevent duplicate submissions
- `parent_job_id`: Job dependencies (DAG)
- `cron_expression`: For recurring jobs
- `next_run_at`: Indexed for efficient polling

### JobExecutions
Tracks each execution attempt with timing.

```sql
CREATE TABLE job_executions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id    UUID REFERENCES workers(id),
  attempt      INTEGER NOT NULL,
  status       VARCHAR(50) NOT NULL, -- STARTED, COMPLETED, FAILED, TIMEOUT
  started_at   TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration     INTEGER, -- milliseconds
  error        JSONB,
  output       JSONB
);

CREATE INDEX idx_job_exec_job ON job_executions(job_id);
CREATE INDEX idx_job_exec_worker ON job_executions(worker_id);
CREATE INDEX idx_job_exec_status ON job_executions(status);
```

**Purpose:**
- Complete execution history
- Performance analytics
- Debugging failed jobs
- Worker performance tracking

### JobLogs
Structured logging for job execution.

```sql
CREATE TABLE job_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  level      VARCHAR(20) NOT NULL, -- DEBUG, INFO, WARN, ERROR
  message    TEXT NOT NULL,
  metadata   JSONB,
  timestamp  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_logs_job_time ON job_logs(job_id, timestamp);
```

**Purpose:**
- Real-time job monitoring
- Debugging
- Audit trail

### DeadLetterQueue
Failed jobs that exceeded max retries.

```sql
CREATE TABLE dead_letter_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  attempts    INTEGER NOT NULL,
  last_error  JSONB NOT NULL,
  moved_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dlq_moved_at ON dead_letter_queue(moved_at);
```

**Purpose:**
- Manual inspection of failed jobs
- Pattern analysis
- Re-queue capability

### Workers
Worker node registration and status.

```sql
CREATE TABLE workers (
  id              UUID PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  hostname        VARCHAR(255) NOT NULL,
  pid             INTEGER NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'IDLE',
  max_concurrency INTEGER DEFAULT 5,
  current_jobs    INTEGER DEFAULT 0,
  queues          TEXT[], -- Array of queue IDs
  last_heartbeat  TIMESTAMP DEFAULT NOW(),
  started_at      TIMESTAMP DEFAULT NOW(),
  stopped_at      TIMESTAMP,
  metadata        JSONB
);

CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_workers_heartbeat ON workers(last_heartbeat);
```

**Status:**
- `IDLE`: Available for work
- `BUSY`: Processing jobs
- `SHUTTING_DOWN`: Graceful shutdown
- `STOPPED`: Terminated

**Monitoring:**
- `last_heartbeat`: Detect failed workers
- `current_jobs`: Track utilization
- Stale jobs reclaimed if heartbeat > 5 minutes

### WorkerHeartbeats
Time-series data for worker health.

```sql
CREATE TABLE worker_heartbeats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id     UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  cpu_usage     FLOAT,
  memory_usage  FLOAT,
  jobs_running  INTEGER NOT NULL,
  timestamp     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_worker_hb_worker_time ON worker_heartbeats(worker_id, timestamp);
```

**Purpose:**
- Health monitoring
- Resource utilization trends
- Performance analysis

### DistributedLocks
Redis-style distributed locking in PostgreSQL.

```sql
CREATE TABLE distributed_locks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_key    VARCHAR(255) UNIQUE NOT NULL,
  owner_id    VARCHAR(255) NOT NULL,
  acquired_at TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP NOT NULL,
  metadata    JSONB
);

CREATE INDEX idx_locks_key ON distributed_locks(lock_key);
CREATE INDEX idx_locks_expires ON distributed_locks(expires_at);
```

**Purpose:**
- Prevent duplicate job execution
- Coordinate distributed operations
- TTL-based automatic release

### AuditLogs
Complete audit trail of all operations.

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id   VARCHAR(255) NOT NULL,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  timestamp     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_time ON audit_logs(timestamp);
```

## Performance Optimizations

### Indexes Strategy
1. **Primary Keys**: UUID for global uniqueness
2. **Foreign Keys**: Always indexed
3. **Query Patterns**: Index on WHERE, ORDER BY, JOIN columns
4. **Composite Indexes**: (queue_id, status) for job polling
5. **Partial Indexes**: Consider for filtered queries

### Query Optimization

**Atomic Job Claiming:**
```sql
UPDATE jobs
SET status = 'CLAIMED', updated_at = NOW()
WHERE id = (
  SELECT id FROM jobs
  WHERE queue_id = ANY($1)
    AND status = 'QUEUED'
    AND (next_run_at IS NULL OR next_run_at <= NOW())
  ORDER BY priority DESC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

**Key Features:**
- `FOR UPDATE SKIP LOCKED`: Skip locked rows (no waiting)
- `ORDER BY priority, created_at`: Fair scheduling
- Atomic operation: Prevents duplicate claims

### Connection Pooling
```typescript
// Prisma configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  connection_limit = 20
  pool_timeout = 10
}
```

### Cascading Deletes
- Organization deletion cascades to all child resources
- Maintains referential integrity
- Automatic cleanup

## Data Retention

### Log Archival
```sql
-- Archive old job logs (> 90 days)
CREATE TABLE job_logs_archive (LIKE job_logs INCLUDING ALL);

-- Move old logs
INSERT INTO job_logs_archive
SELECT * FROM job_logs WHERE timestamp < NOW() - INTERVAL '90 days';

DELETE FROM job_logs WHERE timestamp < NOW() - INTERVAL '90 days';
```

### Metrics Aggregation
```sql
-- Daily job statistics
CREATE MATERIALIZED VIEW daily_job_stats AS
SELECT
  DATE(created_at) as date,
  queue_id,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_sec
FROM jobs
WHERE created_at > NOW() - INTERVAL '1 year'
GROUP BY DATE(created_at), queue_id, status;

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_job_stats;
```

## Backup Strategy
1. **Daily full backups**
2. **WAL archiving for point-in-time recovery**
3. **Separate backup for audit logs**
4. **Test restore procedures monthly**
