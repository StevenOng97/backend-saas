export const mockTwilioClientService = {
  sendSms: jest.fn().mockImplementation(() => ({
    sid: 'SM1234567890abcdef',
    success: true,
  })),
  getMessageStatus: jest.fn().mockImplementation(() => ({
    status: 'delivered',
  })),
  isConfigured: jest.fn().mockReturnValue(true),
};

export const mockTwilioClientServiceNotConfigured = {
  sendSms: jest.fn().mockImplementation(() => ({
    sid: '',
    success: false,
    error: 'Twilio credentials not configured',
  })),
  getMessageStatus: jest.fn().mockImplementation(() => ({
    status: 'unknown',
    error: 'Twilio credentials not configured',
  })),
  isConfigured: jest.fn().mockReturnValue(false),
}; 