import { IsOptional, IsString, IsEnum, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class AddressDto {
  @ApiProperty() @IsString() line1: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() line2?: string;
  @ApiProperty() @IsString() city: string;
  @ApiProperty() @IsString() state: string;
  @ApiProperty() @IsString() postalCode: string;
  @ApiProperty() @IsString() country: string;
}

export class CreateOrderDto {
  @ApiProperty() @IsString() @Matches(UUID_RE, { message: 'cartId must be a UUID' }) cartId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Matches(UUID_RE, { message: 'shippingAddressId must be a UUID' }) shippingAddressId?: string;
  @ApiProperty({ required: false }) @IsOptional() @ValidateNested() @Type(() => AddressDto) shippingAddress?: AddressDto;
  @ApiProperty({ required: false }) @IsOptional() @ValidateNested() @Type(() => AddressDto) billingAddress?: AddressDto;
  @ApiProperty({ required: false }) @IsOptional() @IsEnum(['standard','express','overnight']) shippingMethod?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}
