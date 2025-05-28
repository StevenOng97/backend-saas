import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isReturning?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
