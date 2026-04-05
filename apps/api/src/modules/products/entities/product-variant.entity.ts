import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, p => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ unique: true, length: 100 })
  sku: string;

  @Column({ type: 'jsonb' })
  attributes: Record<string, string>;

  @Column({ name: 'price_modifier', type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceModifier: number;

  @Column({ name: 'stock_quantity', default: 0 })
  stockQuantity: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
