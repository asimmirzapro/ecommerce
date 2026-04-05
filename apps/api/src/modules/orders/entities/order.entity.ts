import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', unique: true, length: 20 })
  orderNumber: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'cart_id', type: 'uuid', nullable: true })
  cartId: string | null;

  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress: Record<string, string>;

  @Column({ name: 'billing_address', type: 'jsonb' })
  billingAddress: Record<string, string>;

  @Column({
    type: 'enum',
    enum: ['pending_payment','payment_failed','confirmed','processing','shipped','delivered','cancelled','refunded'],
    default: 'pending_payment',
  })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'shipping_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @OneToMany(() => OrderItem, i => i.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
