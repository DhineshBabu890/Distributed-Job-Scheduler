# Setup Instructions

Complete guide to get the Distributed Job Scheduler running locally.

## Prerequisites

Ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Redis** 7+ ([Download](https://redis.io/download))
- **npm** or **yarn**
- **Git**

## Quick Start (Docker)

The fastest way to get started:

```bash
# Clone the repository
git clone <repository-url>
cd distributed-job-scheduler

# Copy environment file
cp .env.example .env

# Start all services with Docker
docker-compose up -d

# View logs
docker-compose logs -f
```

Access the application:
- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3000
- **API Health**: http://localhost:3000/health

## Manual Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ..
```

### 2. Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# Update DATABASE_URL, REDIS_HOST, JWT_SECRET, etc.
```

**Important Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/job_scheduler

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (Change in production!)
JWT_SECRET=your-super-secret-key-change-this

# Worker Configuration
WORKER_QUEUES=your-queue-id-1,your-queue-id-2
```

### 3. Setup Database

```bash
# Create PostgreSQL database
createdb job_scheduler

# Run migrations
cd backend
npm run db:migrate

# (Optional) Seed sample data
npm run db:seed

# (Optional) Open Prisma Studio to view database
npm run db:studio
```

### 4. Start Services

Open **three terminal windows**:

**Terminal 1 - API Server:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Worker Service:**
```bash
cd backend
npm run dev:worker
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Verify Installation

1. **Check API Health:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Open Dashboard:**
   Navigate to http://localhost:5173

3. **Register User:**
   - Go to http://localhost:5173/register
   - Create an account
   - Login

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
cd backend
npm run test:unit
npm run test:integration
```

### Database Management

```bash
# Create a new migration
cd backend
npx prisma migrate dev --name description_of_changes

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Generate Prisma Client after schema changes
npx prisma generate

# Open Prisma Studio (Database GUI)
npm run db:studio
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Configuration

### Worker Configuration

Workers can be configured via environment variables:

```env
WORKER_CONCURRENCY=5          # Max concurrent jobs per worker
WORKER_POLL_INTERVAL=1000     # Polling interval in ms
WORKER_HEARTBEAT_INTERVAL=5000 # Heartbeat frequency in ms
WORKER_QUEUES=queue-id-1,queue-id-2 # Comma-separated queue IDs
```

### Queue Configuration

Queues are configured through the API or dashboard:

- **Priority**: 0-10 (higher = more important)
- **Concurrency Limit**: Max concurrent jobs
- **Rate Limit**: Jobs per minute
- **Retry Policy**: Fixed, Linear, or Exponential backoff

## Creating Your First Job

### Via API

```bash
# Login and get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Create a job
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "queueId": "your-queue-id",
    "name": "My First Job",
    "type": "IMMEDIATE",
    "payload": {
      "type": "email",
      "data": {
        "to": "recipient@example.com",
        "subject": "Test Email"
      }
    }
  }'
```

### Via Dashboard

1. Navigate to **Queues** → Create a queue
2. Navigate to **Jobs** → Create a job
3. Fill in job details (name, type, payload)
4. Submit
5. Watch it execute in real-time!

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d job_scheduler
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Worker Not Claiming Jobs

1. **Check worker is running**: Look for "Worker started" in logs
2. **Check queue IDs**: Verify WORKER_QUEUES matches actual queue IDs
3. **Check queue status**: Ensure queue is not paused
4. **Check database**: Verify jobs exist with status='QUEUED'

```sql
-- Check pending jobs
SELECT * FROM jobs WHERE status = 'QUEUED';

-- Check workers
SELECT * FROM workers WHERE status = 'IDLE' OR status = 'BUSY';
```

### Database Migration Errors

```bash
# Reset and reapply migrations
cd backend
npx prisma migrate reset --force
npx prisma migrate dev
```

## Production Deployment

### Build for Production

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

### Environment Variables

Update these for production:

```env
NODE_ENV=production
JWT_SECRET=strong-random-secret-minimum-32-characters
DATABASE_URL=postgresql://user:pass@prod-host:5432/db
CORS_ORIGIN=https://your-domain.com
```

### Database Migrations

```bash
# Run migrations in production
npm run db:migrate:prod
```

### Docker Production Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Scale workers
docker-compose up -d --scale worker=5
```

### Health Checks

Monitor these endpoints:

- **API Health**: `GET /health`
- **Database**: Check connection pool
- **Workers**: Monitor heartbeats

## Monitoring

### Logs Location

```bash
# API logs
backend/logs/combined.log
backend/logs/error.log

# Docker logs
docker-compose logs -f api
docker-compose logs -f worker
```

### Key Metrics to Monitor

1. **Queue Depth**: Number of pending jobs
2. **Worker Utilization**: Current jobs / max concurrency
3. **Job Success Rate**: Completed / Total jobs
4. **Average Execution Time**: Per queue
5. **DLQ Size**: Failed jobs requiring attention

### Database Queries for Monitoring

```sql
-- Queue health
SELECT q.name, qs.* 
FROM queues q
JOIN queue_statistics qs ON q.id = qs.queue_id;

-- Active workers
SELECT * FROM workers 
WHERE last_heartbeat > NOW() - INTERVAL '1 minute';

-- Jobs in dead letter queue
SELECT COUNT(*) FROM dead_letter_queue;

-- Recent failures
SELECT * FROM jobs 
WHERE status = 'FAILED' 
ORDER BY failed_at DESC 
LIMIT 10;
```

## Next Steps

1. **Read Documentation**:
   - [Architecture](./docs/ARCHITECTURE.md)
   - [Database Schema](./docs/DATABASE.md)
   - [Design Decisions](./docs/DESIGN_DECISIONS.md)
   - [API Documentation](./docs/API.md)

2. **Explore Features**:
   - Create different job types (immediate, delayed, recurring)
   - Configure retry policies
   - Monitor worker performance
   - Inspect job execution logs

3. **Customize**:
   - Add your own job execution logic in `backend/src/workers/worker.ts`
   - Customize the dashboard theme
   - Add organization-specific features

## Getting Help

- **Check Logs**: Most issues are evident in logs
- **Database**: Use Prisma Studio to inspect data
- **API**: Use `/health` endpoint to verify services

## Common Issues

| Issue | Solution |
|-------|----------|
| Jobs not executing | Check worker is running and WORKER_QUEUES is set |
| Database errors | Run `npm run db:migrate` |
| Port conflicts | Change PORT in .env |
| Authentication fails | Verify JWT_SECRET matches between services |
| Slow job execution | Increase WORKER_CONCURRENCY |

## Development Tips

- **Hot Reload**: Backend and frontend auto-reload on file changes
- **Prisma Studio**: Great for debugging database issues
- **API Testing**: Use Postman or curl for API testing
- **Real-time Updates**: Dashboard updates via WebSocket automatically

## Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS in production
- [ ] Set appropriate CORS_ORIGIN
- [ ] Use strong database passwords
- [ ] Enable Redis authentication
- [ ] Regular security updates
- [ ] Implement rate limiting

---

**Happy Scheduling! 🚀**

For questions or issues, refer to the documentation in the `docs/` directory.
