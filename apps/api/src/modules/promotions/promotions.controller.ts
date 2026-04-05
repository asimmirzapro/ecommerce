import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private service: PromotionsService) {}

  @Public()
  @Get('active')
  findActive() { return this.service.findActive(); }

  @Public()
  @Get('validate/:code')
  validate(@Param('code') code: string) { return this.service.validateCode(code); }
}
