import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsEmail,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsDateString,
} from 'class-validator';

export class CreateInviteDto {
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  sendAt?: string;
}

export class CreateBatchInviteDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  customerIds: string[];

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  sendAt?: string;
}
