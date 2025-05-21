import { IsOptional, IsString } from 'class-validator';

export class CsvUploadDto {
  @IsOptional()
  @IsString()
  businessId?: string;
} 