import { SmsStatus } from '@prisma/client';

export const mockSmsService = {
  sendSms: jest.fn().mockImplementation(() => ({
    sid: 'mock-twilio-sid',
    success: true,
  })),
  updateSmsStatus: jest.fn().mockImplementation(() => true),
}; 