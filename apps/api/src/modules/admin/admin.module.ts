import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { OrdersModule } from '../orders/orders.module';
import { ReturnsModule } from '../returns/returns.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ProductsModule, CategoriesModule, OrdersModule, ReturnsModule, PromotionsModule, AuthModule],
  controllers: [AdminController],
})
export class AdminModule {}
