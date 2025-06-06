import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { TemplateType } from '@prisma/client';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TemplateType)
  type?: TemplateType;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
} 