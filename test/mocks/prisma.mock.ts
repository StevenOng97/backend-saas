export const mockPrismaService = {
  customer: {
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  invite: {
    create: jest.fn(),
    count: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}; 