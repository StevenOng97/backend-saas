import { IsNotEmpty, IsString, IsUUID, IsEmail, IsOptional } from 'class-validator';

export class CreateInviteDto {
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsEmail()
  email?: string;
} 