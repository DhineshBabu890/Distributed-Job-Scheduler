# Start Services Guide

## Prerequisites
- PostgreSQL running on localhost:5432
- Database `job_scheduler` created and seeded
- Node.js and npm installed

## Start All Services

### Option 1: Run all services (Recommended for development)

Open **3 separate terminal windows** and run:

#### Terminal 1 - Backend API Server
```bash
cd "C:\Users\tempd\Downloads\codity project"
npm run dev --prefix backend
```
This starts the API server on http://localhost:3000

#### Terminal 2 - Worker Service
```bash
cd "C:\Users\tempd\Downloads\codity project"
npm run dev:worker --prefix backend
```
This starts the job worker that processes jobs from queues

#### Terminal 3 - Frontend Dashboard
```bash
cd "C:\Users\tempd\Downloads\codity project\frontend"
npm run dev
```
This starts the frontend on http://localhost:5173

### Option 2: Quick Test (Test backend only)
```bash
cd "C:\Users\tempd\Downloads\codity project"
node test-api.js
```

## Access the Application

1. Open browser: http://localhost:5173
2. Login with demo credentials:
   - Email: `demo@example.com`
   - Password: `password123`

## Testing the Complete Flow

### 1. Create a Queue
- Click "Create Queue" button
- Select "Demo Project"
- Enter queue name (e.g., "test-queue")
- Set priority (0-10)
- Set concurrency limit (e.g., 5)
- Click "Create"

### 2. Create Jobs
- Click "Create Job" button
- Select the queue you created
- Enter job name (e.g., "send-email")
- Choose job type:
  - **Immediate**: Runs right away
  - **Delayed**: Runs after a specific time
  - **Scheduled**: Runs at a specific date/time
  - **Recurring**: Runs on a cron schedule
- Set priority (0-10)
- Update the JSON payload with your data
- Click "Create"

### 3. Monitor Jobs
- The jobs table auto-refreshes every 3 seconds
- Watch as jobs move from QUEUED → RUNNING → COMPLETED
- Check the worker terminal to see job execution logs
- Failed jobs can be retried using the "Retry" button

## Troubleshooting

### Frontend won't start (vite not found)
The package.json has been updated to use `npx vite`. Just run:
```bash
cd frontend
npm run dev
```

### Backend connection error
Check that PostgreSQL is running and the .env file has correct credentials:
```
DATABASE_URL="postgresql://postgres:%40Dhin09072005@localhost:5432/job_scheduler"
```

### Worker not picking up jobs
Make sure the worker service is running in Terminal 2. Check worker logs for errors.

### Jobs stuck in QUEUED status
1. Check worker is running
2. Check queue is not paused (should show "Active" status)
3. Check worker terminal for errors

## Key Features Implemented

✅ Multi-project support
✅ Queue management with pause/resume
✅ Job scheduling (immediate, delayed, scheduled, recurring)
✅ Retry policies with exponential backoff
✅ Dead Letter Queue for failed jobs
✅ Real-time job status updates
✅ Concurrency limiting per queue
✅ Rate limiting
✅ Job execution logs and history
✅ Worker heartbeat monitoring
✅ Authentication and authorization
✅ REST API with validation
✅ Responsive dashboard UI

## API Documentation

### Auth Endpoints
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Projects Endpoints
- GET `/api/projects` - List all projects

### Queues Endpoints
- POST `/api/queues` - Create queue
- GET `/api/queues` - List queues
- GET `/api/queues/:id` - Get queue details
- PATCH `/api/queues/:id` - Update queue
- DELETE `/api/queues/:id` - Delete queue
- POST `/api/queues/:id/pause` - Pause queue
- POST `/api/queues/:id/resume` - Resume queue
- GET `/api/queues/:id/stats` - Get queue statistics

### Jobs Endpoints
- POST `/api/jobs` - Create job
- POST `/api/jobs/batch` - Create multiple jobs
- GET `/api/jobs` - List jobs with filters
- GET `/api/jobs/:id` - Get job details
- POST `/api/jobs/:id/retry` - Retry failed job
- POST `/api/jobs/:id/cancel` - Cancel job

## Production Deployment

See `DEPLOYMENT_CHECKLIST.md` for production deployment steps.
