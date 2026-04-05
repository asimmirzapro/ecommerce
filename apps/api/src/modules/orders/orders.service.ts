import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/order.dto';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private eventEmitter: EventEmitter2,
    private emailService: EmailService,
  ) {}

  private generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${year}-${random}`;
  }

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    try {
    const cart = await this.cartRepo.findOne({
      where: { id: dto.cartId },
      relations: ['items'],
    });
    if (!cart) throw new BadRequestException('Cart not found');
    if (cart.status === 'converted') throw new BadRequestException('Cart has already been checked out');
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    const shippingCost = dto.shippingMethod === 'overnight' ? 25 : dto.shippingMethod === 'express' ? 15 : 9.99;
    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const cartItem of cart.items) {
      const product = await this.productRepo.findOne({ where: { id: cartItem.productId }, relations: ['images'] });
      if (!product) continue;

      const primaryImage = product.images?.find(i => i.isPrimary) || product.images?.[0];
      const itemTotal = Number(cartItem.unitPrice) * cartItem.quantity;
      subtotal += itemTotal;
      orderItems.push({
        productId: product.id,
        variantId: cartItem.variantId,
        productName: product.name,
        productSku: product.sku,
        productImageUrl: primaryImage?.url || null,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice,
        totalPrice: itemTotal,
      });
    }

    const taxAmount = subtotal * 0.08;
    const totalAmount = subtotal + shippingCost + taxAmount;

    const shippingAddress = dto.shippingAddress || { line1: '', city: '', state: '', postalCode: '', country: 'US' };
    const billingAddress = dto.billingAddress || shippingAddress;

    const orderData: any = {
      orderNumber: this.generateOrderNumber(),
      userId,
      cartId: cart.id,
      shippingAddress,
      billingAddress,
      status: 'pending_payment',
      subtotal,
      discountAmount: 0,
      shippingCost,
      taxAmount,
      totalAmount,
      notes: dto.notes || null,
    };
    const order = this.orderRepo.create(orderData) as unknown as Order;

    await this.orderRepo.save(order);

    for (const item of orderItems) {
      const orderItem = this.itemRepo.create({ ...item, orderId: order.id });
      await this.itemRepo.save(orderItem);
    }

    cart.status = 'converted';
    await this.cartRepo.save(cart);

    this.eventEmitter.emit('order.created', { orderId: order.id, userId });
    return this.findOne(order.id);
    } catch (err) {
      this.logger.error('createOrder failed', err?.message, err?.stack);
      throw err;
    }
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id }, relations: ['items'] });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findByOrderNumber(orderNumber: string, userId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { orderNumber, userId },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findUserOrders(userId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['items'],
    });
  }

  async cancelOrder(orderNumber: string, userId: string): Promise<Order> {
    const order = await this.findByOrderNumber(orderNumber, userId);
    if (!['pending_payment', 'confirmed'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }
    const ageMs = Date.now() - new Date(order.createdAt).getTime();
    if (ageMs > 60 * 60 * 1000) {
      throw new BadRequestException('Orders can only be cancelled within 1 hour of placement');
    }
    await this.orderRepo.update(order.id, { status: 'cancelled' });
    const cancelled = await this.findOne(order.id);
    this.eventEmitter.emit('order.cancelled', { orderId: order.id });

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.email) {
      this.emailService.sendOrderCancellation(
        user.email,
        cancelled.orderNumber,
        cancelled.items.map(i => ({
          productName: i.productName,
          quantity: i.quantity,
          totalPrice: Number(i.totalPrice),
          imageUrl: i.productImageUrl ?? null,
        })),
        Number(cancelled.totalAmount),
      );
    }

    return cancelled;
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    await this.orderRepo.update(id, { status });
    const order = await this.findOne(id);
    this.eventEmitter.emit('order.status_changed', { orderId: id, status });

    if (status === 'confirmed') {
      const user = await this.userRepo.findOne({ where: { id: order.userId } });
      if (user?.email) {
        this.emailService.sendOrderConfirmation(
          user.email,
          order.orderNumber,
          order.items.map(i => ({
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            totalPrice: Number(i.totalPrice),
            imageUrl: i.productImageUrl ?? null,
          })),
          Number(order.subtotal),
          Number(order.shippingCost),
          Number(order.taxAmount),
          Number(order.totalAmount),
        );
      }
    }

    return order;
  }

  async confirmOrder(orderNumber: string, userId: string): Promise<Order> {
    const order = await this.findByOrderNumber(orderNumber, userId);
    await this.orderRepo.update(order.id, { status: 'confirmed' });
    const confirmed = await this.findOne(order.id);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.email) {
      this.emailService.sendOrderConfirmation(
        user.email,
        confirmed.orderNumber,
        confirmed.items.map(i => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
          imageUrl: i.productImageUrl ?? null,
        })),
        Number(confirmed.subtotal),
        Number(confirmed.shippingCost),
        Number(confirmed.taxAmount),
        Number(confirmed.totalAmount),
      );
    }

    this.eventEmitter.emit('order.confirmed', { orderId: order.id, userId });
    return confirmed;
  }

  async deleteOrder(orderNumber: string, userId: string): Promise<void> {
    const order = await this.findByOrderNumber(orderNumber, userId);
    await this.itemRepo.delete({ orderId: order.id });
    await this.orderRepo.delete(order.id);
  }

  async clearUserOrders(userId: string): Promise<void> {
    const orders = await this.orderRepo.find({ where: { userId } });
    for (const order of orders) {
      await this.itemRepo.delete({ orderId: order.id });
    }
    await this.orderRepo.delete({ userId });
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const qb = this.orderRepo.createQueryBuilder('o').leftJoinAndSelect('o.items', 'items');
    if (status) qb.where('o.status = :status', { status });
    qb.orderBy('o.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
