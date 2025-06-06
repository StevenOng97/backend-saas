import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { TemplateType } from '@prisma/client';

export class CreateTemplateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(TemplateType)
  type: TemplateType;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  subject?: string; // Required for EMAIL type, optional for SMS

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsUUID()
  businessId?: string;
} 