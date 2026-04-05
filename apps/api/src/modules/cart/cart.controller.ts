import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private service: CartService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  getCart(@CurrentUser() user: any, @Req() req: Request) {
    const sessionId = req.headers['x-session-id'] as string;
    return this.service.getOrCreateCart(user?.id, sessionId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('items')
  async addItem(@CurrentUser() user: any, @Req() req: Request, @Body() dto: AddCartItemDto) {
    const sessionId = req.headers['x-session-id'] as string;
    const cart = await this.service.getOrCreateCart(user?.id, sessionId);
    return this.service.addItem(cart.id, dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Patch('items/:itemId')
  async updateItem(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const sessionId = req.headers['x-session-id'] as string;
    const cart = await this.service.getOrCreateCart(user?.id, sessionId);
    return this.service.updateItem(cart.id, itemId, dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Delete('items/:itemId')
  async removeItem(@CurrentUser() user: any, @Req() req: Request, @Param('itemId') itemId: string) {
    const sessionId = req.headers['x-session-id'] as string;
    const cart = await this.service.getOrCreateCart(user?.id, sessionId);
    return this.service.removeItem(cart.id, itemId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('merge')
  mergeCart(@CurrentUser() user: any, @Req() req: Request) {
    const sessionId = req.headers['x-session-id'] as string;
    return this.service.mergeGuestCart(user.id, sessionId);
  }
}
