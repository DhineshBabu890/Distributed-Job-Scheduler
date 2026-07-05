# Testing Guide for Distributed Job Scheduler

This guide will help you test the project step by step.

## ✅ Pre-Installation Checklist

Before running the project, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL 14+ installed and running
- [ ] Redis 7+ installed and running
- [ ] npm or yarn installed

## 🚀 Installation Steps

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
npm install --prefix backend

# Install frontend dependencies  
npm install --prefix frontend
```

**Expected Time:** 3-5 minutes

### Step 2: Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env file with your local settings
# Required changes:
# - DATABASE_URL (if not using defaults)
# - JWT_SECRET (change to a secure random string)
```

### Step 3: Setup Database

Ensure PostgreSQL is running, then:

```bash
# Create database
createdb job_scheduler

# Or using psql
psql -U postgres -c "CREATE DATABASE job_scheduler;"

# Run migrations (from backend directory)
npm run db:migrate --prefix backend

# Seed sample data
npm run db:seed --prefix backend
```

**Expected Output:**
```
✓ Database migrations completed
✓ Created demo user: demo@example.com
✓ Created organization: Demo Organization
✓ Created project: Demo Project
✓ Created retry policies
✓ Created queue: email-queue
```

### Step 4: Verify Database Setup

```bash
# Check tables were created
npm run db:studio --prefix backend
```

This opens Prisma Studio in your browser where you can see all tables and data.

## 🧪 Testing Scenarios

### Test 1: API Server Health Check

**Start API Server:**
```bash
npm run dev --prefix backend
```

**Test:**
```bash
# In another terminal
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-...",
  "uptime": 5.123
}
```

### Test 2: User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Save the token for next tests!

### Test 3: User Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "user": {...},
  "token": "..."
}
```

### Test 4: Create a Queue

```bash
# Use the token from login
TOKEN="your-token-here"

curl -X POST http://localhost:3000/api/queues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "projectId": "demo-project-id",
    "name": "test-queue",
    "description": "Test queue for email jobs",
    "priority": 5,
    "concurrencyLimit": 10
  }'
```

**Expected Response:**
```json
{
  "queue": {
    "id": "...",
    "name": "test-queue",
    "priority": 5,
    "concurrencyLimit": 10,
    ...
  }
}
```

### Test 5: Create a Job

```bash
QUEUE_ID="queue-id-from-previous-step"

curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "queueId": "'$QUEUE_ID'",
    "name": "Test Email Job",
    "type": "IMMEDIATE",
    "payload": {
      "type": "email",
      "data": {
        "to": "recipient@example.com",
        "subject": "Test Email",
        "body": "This is a test email"
      }
    }
  }'
```

**Expected Response:**
```json
{
  "job": {
    "id": "...",
    "name": "Test Email Job",
    "status": "QUEUED",
    "type": "IMMEDIATE",
    ...
  }
}
```

### Test 6: List Jobs

```bash
curl http://localhost:3000/api/jobs?queueId=$QUEUE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

### Test 7: Start Worker Service

```bash
# Set environment variable with queue ID
export WORKER_QUEUES="$QUEUE_ID"

# Start worker (in new terminal)
npm run dev:worker --prefix backend
```

**Expected Console Output:**
```
Starting worker
Worker started successfully { workerId: '...', hostname: '...', pid: ... }
Job claimed { jobId: '...', workerId: '...' }
Executing job { jobId: '...', workerId: '...' }
Job completed { jobId: '...', duration: 1234 }
```

### Test 8: Verify Job Completion

```bash
# Get job details
JOB_ID="job-id-from-create-step"

curl http://localhost:3000/api/jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Status:** `"COMPLETED"`

### Test 9: Test Frontend

```bash
# Start frontend (in new terminal)
npm run dev --prefix frontend
```

**Then:**
1. Open browser to http://localhost:5173
2. Login with credentials:
   - Email: `demo@example.com`
   - Password: `password123`
3. Navigate to Dashboard
4. Check Queues page
5. Check Jobs page
6. Check Workers page

### Test 10: Test Recurring Job

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "queueId": "'$QUEUE_ID'",
    "name": "Daily Email Report",
    "type": "RECURRING",
    "cronExpression": "0 9 * * *",
    "payload": {
      "type": "report-generation",
      "data": {
        "reportType": "daily-summary"
      }
    }
  }'
```

**Expected:** Job scheduled with status `SCHEDULED`

### Test 11: Test Delayed Job

```bash
# Schedule job for 1 minute from now
SCHEDULED_TIME=$(date -u -d "+1 minute" +"%Y-%m-%dT%H:%M:%SZ")

curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "queueId": "'$QUEUE_ID'",
    "name": "Delayed Notification",
    "type": "DELAYED",
    "scheduledFor": "'$SCHEDULED_TIME'",
    "payload": {
      "type": "email",
      "data": {
        "to": "user@example.com",
        "subject": "Reminder"
      }
    }
  }'
```

**Expected:** Job created with `nextRunAt` in the future

### Test 12: Test Job Retry (Failure Scenario)

```bash
# Create a job that will fail
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "queueId": "'$QUEUE_ID'",
    "name": "Failing Job",
    "type": "IMMEDIATE",
    "maxAttempts": 3,
    "payload": {
      "type": "invalid-type",
      "data": {}
    }
  }'
```

**Expected Behavior:**
- Job attempts execution
- Fails
- Gets retried (up to 3 times)
- Eventually moves to Dead Letter Queue

**Verify in Database:**
```sql
SELECT * FROM jobs WHERE status = 'DEAD_LETTER';
SELECT * FROM dead_letter_queue;
```

### Test 13: Worker Heartbeat

With worker running, check heartbeats:

```sql
-- In psql or Prisma Studio
SELECT * FROM workers WHERE status = 'IDLE' OR status = 'BUSY';
SELECT * FROM worker_heartbeats ORDER BY timestamp DESC LIMIT 10;
```

**Expected:** Recent heartbeat entries (within last 5 seconds)

### Test 14: Queue Pause/Resume

```bash
# Pause queue
curl -X POST http://localhost:3000/api/queues/$QUEUE_ID/pause \
  -H "Authorization: Bearer $TOKEN"

# Create job (should stay queued)
# ...

# Resume queue
curl -X POST http://localhost:3000/api/queues/$QUEUE_ID/resume \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Jobs only process when queue is not paused

### Test 15: Batch Job Creation

```bash
curl -X POST http://localhost:3000/api/jobs/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jobs": [
      {
        "queueId": "'$QUEUE_ID'",
        "name": "Batch Job 1",
        "payload": {"type": "data-processing", "data": {"id": 1}}
      },
      {
        "queueId": "'$QUEUE_ID'",
        "name": "Batch Job 2",
        "payload": {"type": "data-processing", "data": {"id": 2}}
      },
      {
        "queueId": "'$QUEUE_ID'",
        "name": "Batch Job 3",
        "payload": {"type": "data-processing", "data": {"id": 3}}
      }
    ]
  }'
```

**Expected:** All 3 jobs created and processed

## 📊 Monitoring & Debugging

### Check Logs

```bash
# API logs (if running in dev mode, shows in console)

# Worker logs (shows in console)

# Database logs (check PostgreSQL logs)
```

### Database Queries for Monitoring

```sql
-- Queue statistics
SELECT q.name, qs.* 
FROM queues q
JOIN queue_statistics qs ON q.id = qs.queue_id;

-- Recent jobs
SELECT id, name, status, type, created_at 
FROM jobs 
ORDER BY created_at DESC 
LIMIT 20;

-- Active workers
SELECT * FROM workers 
WHERE last_heartbeat > NOW() - INTERVAL '1 minute';

-- Failed jobs
SELECT * FROM jobs 
WHERE status = 'FAILED' 
ORDER BY failed_at DESC;

-- Jobs in DLQ
SELECT j.*, dlq.reason 
FROM jobs j
JOIN dead_letter_queue dlq ON j.id = dlq.job_id;

-- Job execution history
SELECT je.*, w.name as worker_name
FROM job_executions je
LEFT JOIN workers w ON je.worker_id = w.id
ORDER BY je.started_at DESC
LIMIT 20;
```

### Performance Testing

```bash
# Create 100 jobs quickly
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/jobs \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "queueId": "'$QUEUE_ID'",
      "name": "Load Test Job '$i'",
      "type": "IMMEDIATE",
      "payload": {"type": "data-processing", "data": {"index": '$i'}}
    }' &
done
wait
```

Watch worker process them concurrently!

## 🐛 Common Issues & Solutions

### Issue 1: Database Connection Failed

**Error:** `Can't reach database server`

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# If not running, start it
# On Windows:
pg_ctl -D "C:\Program Files\PostgreSQL\14\data" start

# Verify connection
psql -U postgres -d job_scheduler
```

### Issue 2: Redis Connection Failed

**Error:** `ECONNREFUSED 127.0.0.1:6379`

**Solution:**
```bash
# Check Redis is running
redis-cli ping

# If not running, start it
redis-server

# Or on Windows with WSL
wsl redis-server
```

### Issue 3: Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :3000

# Kill process
taskkill /PID <pid> /F

# Or change port in .env
PORT=3001
```

### Issue 4: Worker Not Claiming Jobs

**Check:**
1. Worker is running: `ps aux | grep worker`
2. WORKER_QUEUES environment variable is set
3. Queue is not paused
4. Jobs have status='QUEUED'

```sql
SELECT * FROM jobs WHERE queue_id = 'your-queue-id' AND status = 'QUEUED';
```

### Issue 5: JWT Token Invalid

**Error:** `Invalid token`

**Solution:**
- Token expired (generate new one by logging in)
- JWT_SECRET mismatch (check .env file)
- Token format incorrect (must be `Bearer <token>`)

## ✅ Test Completion Checklist

- [ ] API server starts without errors
- [ ] User can register and login
- [ ] Queue can be created
- [ ] Job can be created and executed
- [ ] Worker claims and processes jobs
- [ ] Job retries work correctly
- [ ] Failed jobs move to DLQ
- [ ] Frontend loads and shows data
- [ ] Recurring jobs are scheduled
- [ ] Delayed jobs execute at correct time
- [ ] Worker heartbeats are recorded
- [ ] Queue pause/resume works
- [ ] Batch jobs can be created
- [ ] Database relationships are correct
- [ ] All API endpoints return correct status codes

## 📈 Performance Benchmarks

Expected performance on modest hardware:

- **Job Creation:** ~100-200 req/sec
- **Job Execution:** ~10-50 jobs/sec per worker
- **Database Queries:** <50ms for most queries
- **Worker Heartbeat:** Every 5 seconds
- **Job Claiming:** <10ms (with proper indexes)

## 🎓 Next Steps

After successful testing:

1. **Customize Job Logic:** Modify `backend/src/workers/worker.ts`
2. **Add More Queues:** Create queues for different job types
3. **Scale Workers:** Run multiple worker instances
4. **Add Monitoring:** Integrate Prometheus/Grafana
5. **Deploy to Production:** Use Docker Compose or Kubernetes

---

**Happy Testing! 🚀**

For issues, check the logs and database state first. Most problems are configuration-related.
