import { IsOptional, IsBoolean } from 'class-validator';

export class CancelSubscriptionDto {
  @IsOptional()
  @IsBoolean()
  immediately?: boolean;
} 