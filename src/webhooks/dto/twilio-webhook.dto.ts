import { IsNotEmpty, IsString, IsIn } from 'class-validator';
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