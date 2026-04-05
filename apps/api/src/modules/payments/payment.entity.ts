import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', unique: true, nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ name: 'stripe_charge_id', type: 'varchar', nullable: true })
  stripeChargeId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ type: 'enum', enum: ['pending','processing','succeeded','failed','cancelled'], default: 'pending' })
  status: string;

  @Column({ name: 'failure_reason', nullable: true, type: 'text' })
  failureReason: string | null;

  @Column({ name: 'stripe_metadata', type: 'jsonb', nullable: true })
  stripeMetadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
