# Architecture Documentation

## System Overview

The Distributed Job Scheduler is built as a modern microservices architecture with clear separation of concerns:

1. **API Server**: RESTful API for job management, authentication, and queue operations
2. **Worker Service**: Autonomous job execution engine with heartbeat monitoring
3. **Database**: PostgreSQL for persistent storage with optimized schemas
4. **Cache/Queue**: Redis for distributed locking and real-time coordination
5. **Dashboard**: React-based web interface for monitoring and management

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         React Dashboard (WebSocket + REST)             │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTPS/WSS
┌─────────────────────────▼────────────────────────────────────┐
│                     API Gateway Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Rate Limiter │  │     CORS     │  │     Auth     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                   Application Layer                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Express.js API Server                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │  Auth    │  │  Queues  │  │   Jobs   │            │  │
│  │  │ Service  │  │ Service  │  │ Service  │            │  │
│  │  └──────────┘  └──────────┘  └──────────┘            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │            WebSocket Server (Socket.io)                 │  │
│  │         Real-time updates for dashboard                 │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────┬──────────────────┘
             │                              │
             │                              │
┌────────────▼────────────┐    ┌───────────▼──────────────────┐
│  PostgreSQL Database    │    │    Redis Cache/Queue         │
│  ┌──────────────────┐   │    │  ┌───────────────────────┐  │
│  │  Users/Orgs      │   │    │  │ Distributed Locks     │  │
│  │  Projects/Queues │   │    │  │ Rate Limit Counters   │  │
│  │  Jobs/Executions │   │    │  │ Session Cache         │  │
│  │  Workers/Logs    │   │    │  └───────────────────────┘  │
│  └──────────────────┘   │    └──────────────────────────────┘
└─────────────────────────┘
             ▲
             │
┌────────────┴────────────────────────────────────────────────┐
│                    Worker Layer                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Worker 1  │  │  Worker 2  │  │  Worker N  │           │
│  │  ┌──────┐  │  │  ┌──────┐  │  │  ┌──────┐  │           │
│  │  │ Poll │  │  │  │ Poll │  │  │  │ Poll │  │           │
│  │  │Claim │  │  │  │Claim │  │  │  │Claim │  │           │
│  │  │Execute│ │  │  │Execute│ │  │  │Execute│ │           │
│  │  │Heart- │ │  │  │Heart- │ │  │  │Heart- │ │           │
│  │  │beat   │  │  │  │beat   │  │  │  │beat   │  │           │
│  │  └──────┘  │  │  └──────┘  │  │  └──────┘  │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. API Server

**Responsibilities:**
- Authentication and authorization
- Job scheduling API
- Queue management API
- Worker registration and monitoring
- Real-time WebSocket updates

**Technology Stack:**
- Node.js + TypeScript
- Express.js framework
- Socket.io for WebSockets
- JWT for authentication
- Prisma ORM

**Key Features:**
- RESTful API design
- Input validation with Zod
- Rate limiting
- CORS protection
- Structured error handling
- Request logging

### 2. Worker Service

**Responsibilities:**
- Poll queues for jobs
- Atomic job claiming with PostgreSQL locks
- Concurrent job execution
- Heartbeat monitoring
- Graceful shutdown
- Job retry logic

**Key Features:**
- Configurable concurrency
- Timeout handling
- Error recovery
- Resource monitoring (CPU, memory)
- Signal handling (SIGTERM, SIGINT)

**Job Execution Flow:**
```
1. Poll → 2. Claim (SELECT FOR UPDATE SKIP LOCKED)
         ↓
3. Mark Running → 4. Execute with Timeout
                 ↓
         5a. Success → Mark Completed
         5b. Failure → Retry or DLQ
```

### 3. Database Layer

**Schema Design:**
- Multi-tenant hierarchy: Organization → Project → Queue → Job
- Normalized schema with proper foreign keys
- Indexes on frequently queried fields
- Cascade delete for data consistency
- Audit trail for all operations

**Performance Optimizations:**
- Connection pooling
- Query optimization
- Strategic indexes
- Materialized statistics
- Proper use of transactions

### 4. Caching & Coordination

**Redis Usage:**
- Distributed locks for coordination
- Rate limit counters
- Session cache
- Real-time metrics

**Lock Strategy:**
- Lease-based with expiration
- Automatic release on failure
- Deadlock prevention

## Data Flow

### Job Creation Flow
```
Client → API → Validate → Create Job → Update Stats → Return
                    ↓
              Emit WebSocket Event
```

### Job Execution Flow
```
Worker Poll → Claim Job (Atomic) → Mark Running → Execute
                                                    ↓
                                            Success/Failure
                                                    ↓
                                    Update Status & Stats
                                                    ↓
                                    Retry or Complete
```

### Retry Flow
```
Job Failed → Check Attempts → Calculate Delay → Re-queue
                    ↓
            Max Attempts?
                    ↓
            Move to DLQ
```

## Scalability Considerations

### Horizontal Scaling

**API Servers:**
- Stateless design
- Load balancer friendly
- Shared session store (Redis)

**Workers:**
- Can scale independently
- No coordination required
- Self-register with heartbeat

**Database:**
- Read replicas for queries
- Connection pooling
- Query optimization

### Vertical Scaling

- Increase worker concurrency
- Larger database instances
- More Redis memory

## Security

### Authentication
- JWT tokens with expiration
- Password hashing with bcrypt
- Secure token storage

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- API key support

### Protection
- Rate limiting per endpoint
- CORS configuration
- Helmet.js security headers
- Input validation
- SQL injection prevention (Prisma)

## Monitoring & Observability

### Metrics
- Job throughput
- Queue depth
- Worker utilization
- Execution latency
- Error rates

### Logging
- Structured JSON logs
- Log levels (debug, info, warn, error)
- Request logging
- Job execution logs

### Health Checks
- API server health endpoint
- Worker heartbeat monitoring
- Database connection status
- Redis connection status

## Reliability

### Fault Tolerance
- Graceful degradation
- Retry mechanisms
- Dead letter queue
- Worker failure recovery

### Data Consistency
- Atomic operations
- Transaction management
- Idempotency keys
- Optimistic locking

### High Availability
- Multiple API instances
- Multiple workers
- Database replication
- Redis Sentinel/Cluster

## Performance

### Optimization Strategies
- Database indexes
- Connection pooling
- Query optimization
- Caching frequently accessed data
- Batch operations
- Asynchronous processing

### Bottleneck Prevention
- Rate limiting
- Queue sharding
- Worker autoscaling
- Database query optimization

## Deployment

### Development
```bash
docker-compose up -d
npm run dev
```

### Production
```bash
# Build
npm run build

# Database migration
npm run db:migrate:prod

# Start services
npm start
npm run start:worker
```

### Container Deployment
- Docker images for API and Worker
- Kubernetes deployment
- Health check endpoints
- Environment-based configuration

## Future Enhancements

1. **Workflow Engine**: DAG-based job dependencies
2. **Multi-region**: Geographic distribution
3. **Advanced Scheduling**: Time zones, business hours
4. **Priority Queues**: Advanced queue management
5. **Job Chaining**: Complex workflows
6. **Metrics Dashboard**: Prometheus + Grafana
7. **Auto-scaling**: Dynamic worker scaling
8. **Event Sourcing**: Complete audit trail
