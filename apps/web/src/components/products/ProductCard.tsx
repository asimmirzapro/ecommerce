'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number | null;
    averageRating: number;
    reviewCount: number;
    stockQuantity: number;
    images: Array<{ url: string; thumbnailUrl?: string | null; isPrimary: boolean }>;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const primaryImage = product.images?.find(i => i.isPrimary) || product.images?.[0];
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : null;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addItem.mutateAsync({ productId: product.id, quantity: 1 });
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden hover:-translate-y-1">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {primaryImage ? (
            <Image
              src={getImageUrl(primaryImage.thumbnailUrl || primaryImage.url)}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ShoppingCart className="w-12 h-12" />
            </div>
          )}
          {discount && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              -{discount}%
            </span>
          )}
          {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
            <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
              Only {product.stockQuantity} left
            </span>
          )}
          {product.stockQuantity === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-gray-800 font-semibold px-3 py-1 rounded-full text-sm">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-orange-500 transition-colors">
            {product.name}
          </h3>

          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex">
                {[1,2,3,4,5].map(star => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${star <= Math.round(product.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">({product.reviewCount})</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-lg text-gray-900">{formatPrice(product.price)}</span>
              {product.compareAtPrice && (
                <span className="ml-2 text-sm text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.stockQuantity === 0 || addItem.isPending}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
