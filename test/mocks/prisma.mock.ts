export const mockPrismaService = {
  customer: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  invite: {
    create: jest.fn(),
    createMany: jest.fn(),
    createManyAndReturn: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}; 