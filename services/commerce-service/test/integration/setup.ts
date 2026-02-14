import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  console.log('Setting up commerce integration tests...');
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log('Tearing down commerce integration tests...');
});

beforeEach(async () => {
  // Clean up test data before each test if needed
});
