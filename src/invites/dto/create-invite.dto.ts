import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateInviteDto {
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsNotEmpty()
  @IsString()
  message: string;
} 