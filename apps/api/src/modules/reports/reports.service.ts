import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getKpiDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [currentRevenue] = await this.orderRepo.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as orders
      FROM orders WHERE status NOT IN ('cancelled','payment_failed')
      AND created_at >= $1
    `, [thirtyDaysAgo]);

    const [prevRevenue] = await this.orderRepo.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as orders
      FROM orders WHERE status NOT IN ('cancelled','payment_failed')
      AND created_at >= $1 AND created_at < $2
    `, [sixtyDaysAgo, thirtyDaysAgo]);

    const [newCustomers] = await this.userRepo.query(`
      SELECT COUNT(*) as count FROM users WHERE created_at >= $1 AND role = 'customer'
    `, [thirtyDaysAgo]);

    const [lowStock] = await this.productRepo.query(`
      SELECT COUNT(*) as count FROM products
      WHERE is_active = true AND stock_quantity <= low_stock_threshold
    `);

    const revenueChange = prevRevenue.revenue > 0
      ? ((currentRevenue.revenue - prevRevenue.revenue) / prevRevenue.revenue) * 100
      : 0;

    return {
      totalRevenue: Number(currentRevenue.revenue),
      revenueChange: Number(revenueChange.toFixed(1)),
      totalOrders: Number(currentRevenue.orders),
      ordersChange: Number(((currentRevenue.orders - prevRevenue.orders) / Math.max(prevRevenue.orders, 1)) * 100).toFixed(1),
      newCustomers: Number(newCustomers.count),
      averageOrderValue: currentRevenue.orders > 0 ? Number((currentRevenue.revenue / currentRevenue.orders).toFixed(2)) : 0,
      lowStockProducts: Number(lowStock.count),
    };
  }

  async getSalesReport(from: string, to: string) {
    return this.orderRepo.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END), 0) as total_refunds
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [from, to]);
  }

  async getTopProducts(limit = 10) {
    return this.productRepo.find({
      where: { isActive: true },
      relations: ['images'],
      order: { soldCount: 'DESC' },
      take: limit,
    });
  }

  async getLowStockProducts() {
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.stockQuantity <= p.lowStockThreshold')
      .orderBy('p.stockQuantity', 'ASC')
      .getMany();
  }
}
