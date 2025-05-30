export const mockQueue = {
  add: jest.fn().mockImplementation(() => ({ id: 'mock-job-id' })),
  addBulk: jest.fn().mockImplementation((jobs) => 
    jobs.map((_, index) => ({ id: `mock-job-id-${index + 1}` }))
  ),
}; 