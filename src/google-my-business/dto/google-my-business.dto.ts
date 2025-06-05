import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateGoogleDataDto {
  @IsOptional()
  @IsString()
  googleLocationId?: string;

  @IsOptional()
  @IsString()
  googlePlaceId?: string;

  @IsOptional()
  @IsString()
  googleBusinessReviewLink?: string;
}

export class ReplyToReviewDto {
  @IsNotEmpty()
  @IsString()
  reviewId: string;

  @IsNotEmpty()
  @IsString()
  replyText: string;

  @IsOptional()
  @IsString()
  locationId?: string;
} 