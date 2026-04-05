import { z } from 'zod';

const addressSchema = z.object({
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
});

export const createOrderSchema = z.object({
  cartId: z.string().uuid(),
  shippingAddressId: z.string().uuid().optional(),
  shippingAddress: addressSchema.optional(),
  billingAddressId: z.string().uuid().optional(),
  billingAddress: addressSchema.optional(),
  shippingMethod: z.enum(['standard', 'express', 'overnight']).default('standard'),
  notes: z.string().max(500).optional(),
  promotionCode: z.string().optional(),
});

export const createReturnSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(['defective', 'wrong_item', 'not_as_described', 'changed_mind', 'other']),
  description: z.string().max(1000).optional(),
  resolution: z.enum(['refund', 'exchange', 'store_credit']).default('refund'),
  items: z.array(
    z.object({
      orderItemId: z.string().uuid(),
      quantity: z.number().int().positive(),
      condition: z.enum(['unopened', 'good', 'damaged']),
    }),
  ),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
