export const mockQueue = {
  add: jest.fn().mockImplementation(() => ({ id: 'mock-job-id' })),
}; 