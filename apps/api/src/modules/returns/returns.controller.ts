import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateReturnDto {
  @ApiProperty() @IsUUID('all') orderId: string;
  @ApiProperty() @IsEnum(['defective','wrong_item','not_as_described','changed_mind','other']) reason: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsEnum(['refund','exchange','store_credit']) resolution: string;
}

@ApiTags('returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private service: ReturnsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateReturnDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findUserReturns(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
