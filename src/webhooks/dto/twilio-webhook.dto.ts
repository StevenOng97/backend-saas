import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';
import { SmsStatus } from '@prisma/client';
export class TwilioWebhookDto {
  @IsNotEmpty()
  @IsString()
  sid: string;

  @IsNotEmpty()
  @IsString()
  @IsIn([SmsStatus.DELIVERED, SmsStatus.FAILED])
  status: SmsStatus;
} 

export class TwilioStatusWebhookDto {
  @IsNotEmpty()
  @IsString()
  MessagingServiceSid: string;

  @IsNotEmpty()
  @IsString()
  ApiVersion: string;

  @IsNotEmpty()
  @IsString()
  MessageStatus: string;

  @IsNotEmpty()
  @IsString()
  SmsSid: string;

  @IsNotEmpty()
  @IsString()
  SmsStatus: string;

  @IsOptional()
  @IsString()
  ErrorCode?: string;

  @IsNotEmpty()
  @IsString()
  To: string;

  @IsNotEmpty()
  @IsString()
  From: string;

  @IsNotEmpty()
  @IsString()
  MessageSid: string;

  @IsNotEmpty()
  @IsString()
  AccountSid: string;
}