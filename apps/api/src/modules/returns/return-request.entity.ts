import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: ['pending','approved','rejected','received','refunded'], default: 'pending' })
  status: string;

  @Column({ type: 'enum', enum: ['defective','wrong_item','not_as_described','changed_mind','other'] })
  reason: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ type: 'enum', enum: ['refund','exchange','store_credit'], default: 'refund' })
  resolution: string;

  @Column({ name: 'admin_notes', nullable: true, type: 'text' })
  adminNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
