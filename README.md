# Distributed Job Scheduler

A production-grade distributed job scheduling platform for reliably executing asynchronous background jobs across multiple workers.

## 🎯 Project Overview

This system enables organizations to schedule and execute background jobs with high reliability, proper retry mechanisms, and comprehensive monitoring capabilities.

## ✨ Features

### Core Features
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Multi-tenancy**: Organizations → Projects → Queues hierarchy
- **Queue Management**: Priority, concurrency limits, pause/resume, retry policies
- **Job Types**: Immediate, delayed, scheduled, recurring (cron), batch jobs
- **Worker Service**: Atomic job claiming, concurrent execution, heartbeats, graceful shutdown
- **Job Lifecycle**: Complete state management with retry and DLQ support
- **Retry Strategies**: Fixed delay, linear backoff, exponential backoff
- **Comprehensive Logging**: Execution logs, retry history, metrics
- **Web Dashboard**: Queue management, job inspection, worker monitoring, analytics

### Bonus Features
- **Workflow Dependencies**: DAG-based job orchestration
- **Rate Limiting**: Token bucket algorithm per queue
- **Distributed Locking**: Redis-based coordination
- **Queue Sharding**: Horizontal scaling support
- **WebSocket Updates**: Real-time dashboard updates
- **AI-powered Insights**: Failure pattern analysis

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server │────▶│  Database   │
│ (Dashboard) │     │   (Node.js) │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │                     ▲
                           │                     │
                           ▼                     │
                    ┌─────────────┐             │
                    │    Redis    │             │
                    │   (Queue)   │             │
                    └─────────────┘             │
                           │                     │
                           ▼                     │
                    ┌─────────────┐             │
                    │   Workers   │─────────────┘
                    │  (Node.js)  │
                    └─────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd distributed-job-scheduler

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:migrate
npm run db:seed

# Start services
npm run dev:api      # Start API server
npm run dev:worker   # Start worker service
npm run dev:client   # Start dashboard
```

### Docker Setup

```bash
docker-compose up -d
```

## 📚 Documentation

- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Design Decisions](./docs/DESIGN_DECISIONS.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📊 Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis with Bull
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **Testing**: Jest + Supertest

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: React Query + Zustand
- **Charts**: Recharts
- **WebSocket**: Socket.io-client

### DevOps
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana (optional)

## 📁 Project Structure

```
distributed-job-scheduler/
├── backend/
│   ├── src/
│   │   ├── api/           # REST API routes
│   │   ├── services/      # Business logic
│   │   ├── workers/       # Job worker implementation
│   │   ├── models/        # Database models
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utilities
│   │   └── config/        # Configuration
│   ├── prisma/            # Database schema & migrations
│   └── tests/             # Backend tests
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API client
│   │   ├── store/         # State management
│   │   └── utils/         # Utilities
│   └── public/            # Static assets
├── docs/                  # Documentation
├── docker-compose.yml     # Docker setup
└── package.json          # Dependencies
```

## 🔑 Key Features Explained

### Atomic Job Claiming
Workers use PostgreSQL row-level locking with `SELECT FOR UPDATE SKIP LOCKED` to atomically claim jobs, preventing duplicate execution.

### Retry Strategies
- **Fixed Delay**: Retry after constant interval
- **Linear Backoff**: Delay increases linearly
- **Exponential Backoff**: Delay doubles each retry

### Dead Letter Queue (DLQ)
Jobs that exceed max retries are moved to DLQ for manual inspection and potential re-queuing.

### Worker Heartbeats
Workers send periodic heartbeats. Stale jobs are reclaimed if worker fails.

### Graceful Shutdown
Workers finish in-progress jobs before shutting down (SIGTERM handling).

## 📈 Performance Considerations

- Database indexes on frequently queried fields
- Connection pooling for database and Redis
- Job batching for high-throughput scenarios
- Queue sharding for horizontal scaling
- Rate limiting to prevent system overload

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Zod
- SQL injection prevention with Prisma
- CORS configuration
- Rate limiting on API endpoints

## 📄 License

MIT

## 👥 Author

Created for internship assignment evaluation.
