import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateSmsTemplateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  template: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;
} 