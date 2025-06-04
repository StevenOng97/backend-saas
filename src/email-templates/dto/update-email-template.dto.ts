import { IsOptional, IsString } from 'class-validator';

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  template?: string;
} 