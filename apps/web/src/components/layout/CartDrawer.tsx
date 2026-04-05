'use client';
import { X, ShoppingBag, Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui.store';
import { useCart } from '@/hooks/useCart';
import { formatPrice, getImageUrl } from '@/lib/utils';
import api from '@/lib/api';

function useRelatedProducts(categoryIds: string[], excludeIds: string[]) {
  return useQuery({
    queryKey: ['related-products', categoryIds.join(','), excludeIds.join(',')],
    queryFn: async () => {
      if (!categoryIds.length) return [];
      const { data } = await api.get('/products/related', {
        params: {
          categoryIds: categoryIds.join(','),
          exclude: excludeIds.join(','),
          limit: 6,
        },
      });
      return data as any[];
    },
    enabled: categoryIds.length > 0,
    staleTime: 60_000,
  });
}

export default function CartDrawer() {
  const { isCartOpen, closeCart } = useUIStore();
  const { cart, updateItem, removeItem, addItem } = useCart();

  const items = cart?.items || [];
  const total = cart?.total || 0;

  const categoryIds = [...new Set(items.map((i: any) => i.product?.categoryId).filter(Boolean))];
  const cartProductIds = items.map((i: any) => i.productId).filter(Boolean);

  const { data: relatedProducts = [] } = useRelatedProducts(categoryIds as string[], cartProductIds as string[]);

  if (!isCartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={closeCart} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-[#1a1a2e] text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Shopping Cart ({cart?.itemCount || 0})
          </h2>
          <button onClick={closeCart} className="hover:text-orange-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">Your cart is empty</p>
                <Link
                  href="/products"
                  onClick={closeCart}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item: any) => {
                  const primaryImage = item.product?.images?.find((i: any) => i.isPrimary) || item.product?.images?.[0];
                  return (
                    <div key={item.id} className="flex gap-3 border rounded-lg p-3">
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={getImageUrl(primaryImage?.thumbnailUrl || primaryImage?.url)}
                          alt={item.product?.name || ''}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product?.name}</p>
                        <p className="text-orange-500 font-bold text-sm">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => item.quantity > 1 ? updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 }) : removeItem.mutate(item.id)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem.mutate(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors self-start"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {relatedProducts.length > 0 && (
            <div className="px-4 pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">You might also like</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {relatedProducts.map((product: any) => {
                  const img = product.images?.find((i: any) => i.isPrimary) || product.images?.[0];
                  return (
                    <div key={product.id} className="flex-shrink-0 w-32 border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
                      <div className="relative w-full h-24 bg-gray-100">
                        <Image
                          src={getImageUrl(img?.thumbnailUrl || img?.url)}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-orange-500 font-bold mt-0.5">{formatPrice(product.price)}</p>
                        <button
                          onClick={() => addItem?.mutate({ productId: product.id, quantity: 1 })}
                          className="mt-2 w-full flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs py-1.5 rounded transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-lg">Total:</span>
              <span className="font-bold text-xl text-orange-500">{formatPrice(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-3 rounded-lg font-semibold transition-colors"
            >
              Proceed to Checkout
            </Link>
            <Link href="/products" onClick={closeCart} className="block w-full text-center text-gray-500 hover:text-gray-700 mt-2 text-sm transition-colors">
              Continue Shopping
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
