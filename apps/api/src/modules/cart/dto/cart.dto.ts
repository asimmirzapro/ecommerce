import { IsInt, Min, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AddCartItemDto {
  @ApiProperty()
  @IsString()
  @Matches(UUID_RE, { message: 'productId must be a UUID' })
  productId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(UUID_RE, { message: 'variantId must be a UUID' })
  variantId?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ApplyPromoDto {
  @ApiProperty()
  @IsString()
  code: string;
}
