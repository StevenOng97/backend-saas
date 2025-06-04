import { IsOptional, IsString } from 'class-validator';

export class UpdateSmsTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  template?: string;
} 