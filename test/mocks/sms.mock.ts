import { SmsStatus } from '@prisma/client';

export const mockSmsService = {
  sendSms: jest.fn().mockImplementation(() => ({
    sid: 'mock-twilio-sid',
    success: true,
  })),
  sendReviewInvite: jest.fn().mockImplementation(() => ({
    sid: 'mock-twilio-sid',
    success: true,
  })),
  updateSmsStatus: jest.fn().mockImplementation(() => true),
  markCustomerAsOptedOut: jest.fn().mockImplementation(() => true),
  markCustomerAsOptedIn: jest.fn().mockImplementation(() => true),
}; 