import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.service.createOrder(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findUserOrders(user.id);
  }

  @Get(':orderNumber')
  async findOne(@CurrentUser() user: any, @Param('orderNumber') orderNumber: string) {
    const order = await this.service.findByOrderNumber(orderNumber, user.id);
    const cancellableUntil = new Date(new Date(order.createdAt).getTime() + 60 * 60 * 1000).toISOString();
    return { ...order, cancellableUntil };
  }

  @Post(':orderNumber/confirm')
  confirm(@CurrentUser() user: any, @Param('orderNumber') orderNumber: string) {
    return this.service.confirmOrder(orderNumber, user.id);
  }

  @Post(':orderNumber/cancel')
  cancel(@CurrentUser() user: any, @Param('orderNumber') orderNumber: string) {
    return this.service.cancelOrder(orderNumber, user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clearAll(@CurrentUser() user: any) {
    return this.service.clearUserOrders(user.id);
  }

  @Delete(':orderNumber')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteOne(@CurrentUser() user: any, @Param('orderNumber') orderNumber: string) {
    return this.service.deleteOrder(orderNumber, user.id);
  }
}
