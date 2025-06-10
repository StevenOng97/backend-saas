import { IsString, IsOptional, IsNumber, Min, IsEmail } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  priceId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  trialDays?: number;
} 