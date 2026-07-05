import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  console.log('Created demo user:', user.email);

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
    },
  });

  console.log('Created organization:', org.name);

  // Add user to organization
  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
    },
  });

  // Create project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-id' },
    update: {},
    create: {
      id: 'demo-project-id',
      organizationId: org.id,
      name: 'Demo Project',
      description: 'A sample project for testing',
    },
  });

  console.log('Created project:', project.name);

  // Create retry policies
  const retryPolicies = [
    {
      name: 'Default Fixed Delay',
      strategy: 'FIXED_DELAY' as const,
      maxAttempts: 3,
      initialDelayMs: 5000,
      maxDelayMs: 60000,
      backoffMultiplier: 1.0,
    },
    {
      name: 'Linear Backoff',
      strategy: 'LINEAR_BACKOFF' as const,
      maxAttempts: 5,
      initialDelayMs: 2000,
      maxDelayMs: 30000,
      backoffMultiplier: 1.0,
    },
    {
      name: 'Exponential Backoff',
      strategy: 'EXPONENTIAL_BACKOFF' as const,
      maxAttempts: 5,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 2.0,
    },
  ];

  for (const policy of retryPolicies) {
    await prisma.retryPolicy.upsert({
      where: { name: policy.name },
      update: {},
      create: policy,
    });
  }

  console.log('Created retry policies');

  // Create sample queue
  const retryPolicy = await prisma.retryPolicy.findUnique({
    where: { name: 'Exponential Backoff' },
  });

  const queue = await prisma.queue.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'email-queue',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'email-queue',
      description: 'Queue for sending emails',
      priority: 5,
      concurrencyLimit: 10,
      rateLimit: 100,
      retryPolicyId: retryPolicy?.id,
    },
  });

  console.log('Created queue:', queue.name);

  // Initialize queue stats
  await prisma.queueStats.upsert({
    where: { queueId: queue.id },
    update: {},
    create: {
      queueId: queue.id,
    },
  });

  console.log('Seeding completed successfully!');
  console.log('\nDemo credentials:');
  console.log('Email: demo@example.com');
  console.log('Password: password123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
