export interface SmsJobData {
  businessId: string;
  customerId: string;
  inviteId: string;
  message: string; // Custom message from frontend (not used in final SMS body)
  templateId?: string;
}

export interface SmsJobResult {
  sid: string;
} 