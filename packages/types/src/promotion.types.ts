export type PromotionType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';
export type PromotionTarget = 'all' | 'category' | 'product' | 'user_segment';
export type UserSegment = 'all' | 'new' | 'loyal' | 'vip';

export interface Promotion {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: PromotionType;
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number;
  target: PromotionTarget;
  targetIds: string[];
  userSegment: UserSegment;
  startsAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
}
