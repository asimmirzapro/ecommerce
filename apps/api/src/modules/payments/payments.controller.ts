import { Controller, Post, Body, Req, Headers, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

class CreatePaymentIntentDto {
  @ApiProperty() @IsUUID('all') orderId: string;
}

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Post('create-intent')
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.service.createPaymentIntent(dto.orderId);
  }

  @Public()
  @Post('webhook')
  webhook(@Req() req: RawBodyRequest<Request>) {
    return this.service.handleWebhook(req);
  }
}
