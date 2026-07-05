# Design Decisions Document

## Overview
This document explains key architectural and technical decisions made during the development of the Distributed Job Scheduler, including trade-offs, alternatives considered, and rationale.

## 1. Technology Stack

### Backend: Node.js + TypeScript + Express

**Decision:** Use Node.js with TypeScript and Express.js framework

**Rationale:**
- **Async I/O**: Node.js excels at I/O-bound operations (database queries, API calls)
- **TypeScript**: Strong typing prevents runtime errors and improves maintainability
- **Express**: Battle-tested, minimal overhead, extensive middleware ecosystem
- **Single Language**: JavaScript/TypeScript across full stack reduces context switching

**Alternatives Considered:**
- **Python + FastAPI**: Better for CPU-intensive tasks but slower for I/O
- **Go**: Excellent performance but steeper learning curve, smaller ecosystem
- **Java + Spring**: Enterprise-grade but heavyweight, slower development

**Trade-offs:**
- ✅ Faster development, shared code between services
- ✅ Non-blocking I/O ideal for job scheduling
- ❌ Not ideal for CPU-intensive job processing (mitigated by worker design)

---

## 2. Database: PostgreSQL

**Decision:** PostgreSQL as primary datastore

**Rationale:**
- **ACID Compliance**: Critical for job state consistency
- **Row-Level Locking**: `SELECT FOR UPDATE SKIP LOCKED` enables atomic job claiming
- **JSON Support**: Flexible job payload storage with JSONB
- **Advanced Features**: CTEs, window functions, full-text search
- **Proven Reliability**: Battle-tested in production environments

**Alternatives Considered:**
- **MongoDB**: Better for unstructured data but lacks ACID transactions
- **MySQL**: Good but weaker JSON support and less advanced features
- **DynamoDB**: Excellent scalability but higher complexity and cost

**Trade-offs:**
- ✅ Strong consistency guarantees
- ✅ Excellent query capabilities
- ❌ Vertical scaling limits (mitigated by read replicas)

---

## 3. Job Claiming: SELECT FOR UPDATE SKIP LOCKED

**Decision:** Use PostgreSQL's `FOR UPDATE SKIP LOCKED` for atomic job claiming

**Rationale:**
- **Atomic Operation**: Prevents duplicate job execution
- **No Wait**: `SKIP LOCKED` prevents worker blocking
- **Database-Level**: No need for external coordination (Redis locks)
- **Simple**: Single query handles claim + update

**Alternatives Considered:**
- **Redis Distributed Locks**: Additional infrastructure, network overhead
- **Optimistic Locking**: Risk of high contention and retries
- **Message Queue (RabbitMQ/SQS)**: Additional complexity, harder to query

**Implementation:**
```sql
UPDATE jobs SET status = 'CLAIMED'
WHERE id = (
  SELECT id FROM jobs
  WHERE status = 'QUEUED' AND next_run_at <= NOW()
  ORDER BY priority DESC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

**Trade-offs:**
- ✅ Simple, reliable, no race conditions
- ✅ No external dependencies
- ❌ Database becomes coordination point (mitigated by connection pooling)

---

## 4. Retry Strategy: Configurable Backoff

**Decision:** Support multiple retry strategies (fixed, linear, exponential)

**Rationale:**
- **Flexibility**: Different jobs need different retry patterns
- **Resource Protection**: Exponential backoff prevents thundering herd
- **User Control**: Users can tune based on their use case

**Strategies:**
- **Fixed Delay**: Simple, predictable (good for transient errors)
- **Linear Backoff**: Gradual increase (good for rate-limited APIs)
- **Exponential Backoff**: Rapid back-off (good for overload scenarios)

**Example:**
```
Attempt 1: 1s delay
Attempt 2: 2s (linear) or 2s (exponential)
Attempt 3: 3s (linear) or 4s (exponential)
Attempt 4: 4s (linear) or 8s (exponential)
```

**Trade-offs:**
- ✅ Flexible, user-controlled
- ✅ Prevents system overload
- ❌ Complex configuration for users (mitigated by sensible defaults)

---

## 5. Worker Architecture: Pull-Based Polling

**Decision:** Workers poll database for jobs (pull model)

**Rationale:**
- **Simplicity**: No complex message broker setup
- **Visibility**: All state in database, easy to query
- **Scaling**: Add workers without coordination
- **Failure Recovery**: Failed workers don't lose messages

**Alternatives Considered:**
- **Push Model (Redis Pub/Sub)**: Faster but complex failure handling
- **Message Queue (RabbitMQ)**: Full-featured but operational overhead
- **Event Sourcing**: Complex, higher latency

**Polling Optimization:**
- Configurable poll interval (default 1s)
- Exponential backoff when queue empty
- Multiple workers poll in parallel (no contention with SKIP LOCKED)

**Trade-offs:**
- ✅ Simple, reliable, easy to debug
- ✅ No message loss on worker failure
- ❌ Slight latency vs push (1s polling interval)
- ❌ Database load from polling (mitigated by indexes, connection pooling)

---

## 6. Heartbeat Monitoring

**Decision:** Workers send periodic heartbeats; stale jobs are reclaimed

**Rationale:**
- **Fault Tolerance**: Detect and recover from worker failures
- **Resource Tracking**: Monitor CPU, memory, active jobs
- **Health Dashboard**: Real-time worker status

**Implementation:**
- Workers send heartbeat every 5 seconds
- Jobs with no heartbeat for 5 minutes are reclaimed
- Graceful shutdown waits for in-progress jobs

**Trade-offs:**
- ✅ Automatic failure recovery
- ✅ Prevents stuck jobs
- ❌ Additional database writes (mitigated by batch inserts)

---

## 7. Dead Letter Queue (DLQ)

**Decision:** Move jobs to DLQ after max retry attempts

**Rationale:**
- **Visibility**: Failed jobs don't disappear
- **Manual Intervention**: Operators can inspect and requeue
- **Pattern Analysis**: Identify systemic issues

**DLQ Workflow:**
```
Job fails → Retry (up to max_attempts) → Move to DLQ
```

**Trade-offs:**
- ✅ No silent failures
- ✅ Debuggable
- ❌ Requires manual intervention

---

## 8. WebSocket for Real-Time Updates

**Decision:** Socket.io for real-time dashboard updates

**Rationale:**
- **User Experience**: Instant feedback on job status changes
- **Efficiency**: Push updates vs polling
- **Compatibility**: Fallback to long-polling if WebSocket unavailable

**Alternatives Considered:**
- **Server-Sent Events (SSE)**: Simpler but one-way only
- **Long Polling**: Compatible but inefficient
- **GraphQL Subscriptions**: Overkill for simple updates

**Trade-offs:**
- ✅ Real-time updates
- ✅ Reduced API load
- ❌ Connection management overhead

---

## 9. Multi-Tenancy: Organization → Project → Queue

**Decision:** Three-level hierarchy for resource isolation

**Rationale:**
- **Isolation**: Separate customers' data
- **Organization**: Projects group related queues
- **Flexibility**: Different teams in same organization

**Structure:**
```
Organization (company)
  └─ Project (team/service)
      └─ Queue (specific job type)
          └─ Job
```

**Trade-offs:**
- ✅ Clear boundaries
- ✅ Fine-grained permissions
- ❌ More complex queries (mitigated by indexes)

---

## 10. Idempotency Keys

**Decision:** Optional idempotency keys to prevent duplicate job creation

**Rationale:**
- **Safety**: Network retries don't create duplicate jobs
- **User Control**: Optional (not all jobs need it)

**Implementation:**
```typescript
const job = await jobService.createJob({
  ...data,
  idempotencyKey: 'user-123-email-welcome'
});
// Second call with same key returns existing job
```

**Trade-offs:**
- ✅ Prevents duplicates
- ✅ Simple to use
- ❌ Users must generate unique keys

---

## 11. Cron Expressions for Recurring Jobs

**Decision:** Standard cron syntax for scheduling

**Rationale:**
- **Familiarity**: Developers know cron syntax
- **Flexibility**: Supports complex schedules
- **Library Support**: Robust parsing libraries available

**Example:**
```
0 9 * * 1-5  // Every weekday at 9 AM
*/15 * * * * // Every 15 minutes
0 0 1 * *    // First day of month
```

**Trade-offs:**
- ✅ Powerful, familiar
- ❌ Complex syntax for non-technical users (mitigated by UI helpers)

---

## 12. Job Dependencies (Bonus Feature)

**Decision:** Parent-child job relationships for workflows

**Rationale:**
- **Workflows**: Enable complex multi-step processes
- **DAG Support**: Directed acyclic graphs
- **Conditional Execution**: Child jobs wait for parent completion

**Implementation:**
```typescript
const parentJob = await createJob({ name: 'Extract Data' });
const childJob = await createJob({ 
  name: 'Transform Data',
  parentJobId: parentJob.id 
});
```

**Trade-offs:**
- ✅ Powerful workflow capabilities
- ❌ Complexity in cycle detection
- ❌ Requires careful error handling

---

## 13. Rate Limiting

**Decision:** Token bucket algorithm per queue

**Rationale:**
- **Resource Protection**: Prevent overwhelming downstream services
- **Fair Usage**: Limit jobs per minute per queue
- **Configurable**: Users set their own limits

**Implementation:**
- Check tokens before claiming job
- Replenish tokens every minute
- Skip queue if no tokens available

**Trade-offs:**
- ✅ Protects downstream services
- ✅ Simple to understand
- ❌ Slightly reduces throughput

---

## 14. Logging Strategy

**Decision:** Structured JSON logging with Winston

**Rationale:**
- **Parseable**: Easy to index and search (ELK, Datadog)
- **Contextual**: Include request IDs, user IDs, job IDs
- **Levels**: Debug, Info, Warn, Error for filtering

**Job-Specific Logs:**
- Separate `job_logs` table for per-job logging
- Enables real-time log streaming in dashboard
- Archival strategy for old logs

**Trade-offs:**
- ✅ Excellent observability
- ✅ Easy debugging
- ❌ Storage overhead (mitigated by log rotation)

---

## 15. Security Decisions

### JWT Authentication
**Decision:** Stateless JWT tokens

**Rationale:**
- **Scalability**: No session storage needed
- **Portability**: Works across services
- **Standard**: Well-understood security model

**Trade-offs:**
- ✅ Stateless, fast
- ❌ Hard to revoke (mitigated by short expiration)

### Password Hashing
**Decision:** Bcrypt with salt rounds = 10

**Rationale:**
- **Proven Security**: Industry standard
- **Adaptive**: Can increase rounds as hardware improves
- **Salt**: Protects against rainbow tables

### Rate Limiting
**Decision:** Express rate limiter middleware

**Rationale:**
- **DDoS Protection**: Prevent abuse
- **Fair Usage**: 100 requests per 15 minutes

---

## 16. Testing Strategy

**Decision:** Jest for unit, integration, and E2E tests

**Rationale:**
- **Comprehensive**: Single framework for all test types
- **Mocking**: Built-in mocking capabilities
- **Coverage**: Integrated coverage reporting

**Test Types:**
- **Unit**: Service functions, utilities
- **Integration**: API endpoints, database operations
- **E2E**: Full workflows (create job → execute → complete)

**Trade-offs:**
- ✅ Single framework
- ✅ Good developer experience
- ❌ Slower than some alternatives (acceptable)

---

## 17. Performance Optimizations

### Database Indexes
- Composite index on `(queue_id, status)` for job polling
- Index on `next_run_at` for scheduled jobs
- Index on `last_heartbeat` for stale worker detection

### Connection Pooling
- Prisma connection pool: 20 connections
- Redis connection pool: 10 connections

### Query Optimization
- Use `SELECT FOR UPDATE SKIP LOCKED` to avoid blocking
- Denormalize queue statistics for fast dashboard
- Pagination on all list endpoints

---

## 18. Future Improvements

### Considered but Deprioritized:
1. **Job Batching**: Claim multiple jobs at once (complexity vs benefit)
2. **Priority Queues**: Separate queues per priority (overhead)
3. **Job Cancellation**: Cancel running jobs (requires worker coordination)
4. **Workflow Engine**: Full DAG support (scope creep)

### Roadmap:
1. **Metrics Dashboard**: Prometheus + Grafana integration
2. **Auto-Scaling**: Dynamic worker scaling based on queue depth
3. **Multi-Region**: Geographic distribution for low latency
4. **ML Insights**: Predict job failures, optimize scheduling

---

## Conclusion

These design decisions balance **simplicity, reliability, and scalability**. The architecture prioritizes:

1. **Correctness**: ACID transactions, atomic operations
2. **Observability**: Comprehensive logging, metrics, audit trails
3. **Developer Experience**: Clean APIs, good documentation
4. **Operational Simplicity**: Minimal dependencies, easy deployment

Trade-offs were made consciously, with migration paths for future optimization.
