import { IsOptional, IsString } from 'class-validator';

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  googleBusinessReviewLink?: string;
} 