import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class TwilioIncomingSmsDto {
  @IsNotEmpty()
  @IsString()
  From: string; // Phone number that sent the message

  @IsNotEmpty()
  @IsString()
  Body: string; // Message content

  @IsOptional()
  @IsString()
  To?: string; // Your Twilio number that received the message

  @IsOptional()
  @IsString()
  MessageSid?: string; // Twilio message SID

  @IsOptional()
  @IsString()
  AccountSid?: string; // Twilio account SID
} 