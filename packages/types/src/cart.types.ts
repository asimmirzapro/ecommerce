export type CartStatus = 'active' | 'merged' | 'abandoned' | 'converted';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    slug: string;
    images: Array<{ url: string; thumbnailUrl: string | null; isPrimary: boolean }>;
  };
  variant?: {
    id: string;
    attributes: Record<string, string>;
    priceModifier: number;
  } | null;
}

export interface Cart {
  id: string;
  userId: string | null;
  sessionId: string | null;
  status: CartStatus;
  items: CartItem[];
  appliedPromotion?: {
    code: string;
    discountAmount: number;
  } | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  itemCount: number;
}
