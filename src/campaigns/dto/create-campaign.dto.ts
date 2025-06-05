import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { CampaignType } from '@prisma/client';

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(CampaignType)
  type: CampaignType;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  subject?: string; // Required for EMAIL type, optional for SMS

  @IsNotEmpty()
  @IsString()
  content: string; // This replaces the 'template' field from the old models

  @IsOptional()
  @IsInt()
  @Min(0)
  sendDelay?: number; // Days

  @IsOptional()
  @IsBoolean()
  autoSend?: boolean;

  @IsOptional()
  followUpSequence?: any; // JSON field

  @IsOptional()
  @IsUUID()
  businessId?: string;
} 