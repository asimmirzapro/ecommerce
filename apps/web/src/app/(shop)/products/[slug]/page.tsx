'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Image from 'next/image';
import { Star, ShoppingCart, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>();
  const [isZoomed, setIsZoomed] = useState(false);
  const { addItem } = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`).then(r => r.data),
  });

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-12">
      <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
      </div>
    </div>
  );

  if (!product) return <div className="text-center py-20">Product not found</div>;

  const sortedImages = [...(product.images || [])].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const currentImage = sortedImages[selectedImage];
  const discount = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : null;

  const handleAddToCart = async () => {
    try {
      await addItem.mutateAsync({ productId: product.id, variantId: selectedVariant, quantity });
      toast.success(`${product.name} added to cart!`);
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div>
          <div
            className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4 cursor-zoom-in"
            onClick={() => setIsZoomed(!isZoomed)}
          >
            {currentImage ? (
              <Image
                src={getImageUrl(currentImage.url)}
                alt={product.name}
                fill
                className={`object-contain transition-transform duration-300 ${isZoomed ? 'scale-150' : 'scale-100'}`}
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <ShoppingCart className="w-20 h-20" />
              </div>
            )}
            {discount && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                -{discount}% OFF
              </span>
            )}
            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-full p-2">
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </div>
            {sortedImages.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setSelectedImage(i => Math.max(0, i - 1)); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setSelectedImage(i => Math.min(sortedImages.length - 1, i + 1)); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          {sortedImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sortedImages.map((img: any, i: number) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === selectedImage ? 'border-orange-500' : 'border-transparent hover:border-gray-300'}`}
                >
                  <Image src={getImageUrl(img.thumbnailUrl || img.url)} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {product.category && <p className="text-sm text-orange-500 font-medium mb-1">{product.category.name}</p>}
          <h1 className="text-3xl font-bold mb-3">{product.name}</h1>

          {product.reviewCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(product.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                ))}
              </div>
              <span className="text-sm text-gray-500">{product.averageRating} ({product.reviewCount} reviews)</span>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl font-extrabold text-gray-900">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-xl text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-gray-600 mb-6 leading-relaxed">{product.shortDescription}</p>
          )}

          {product.variants?.length > 0 && (
            <div className="mb-6">
              <p className="font-medium mb-2">Options</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id)}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${selectedVariant === v.id ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    {Object.values(v.attributes).join(' / ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            {product.stockQuantity === 0 ? (
              <span className="text-red-500 font-medium">Out of Stock</span>
            ) : product.stockQuantity <= product.lowStockThreshold ? (
              <span className="text-orange-500 font-medium">Only {product.stockQuantity} left!</span>
            ) : (
              <span className="text-green-600 font-medium">In Stock</span>
            )}
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-3 hover:bg-gray-50 font-bold">−</button>
              <span className="px-4 py-3 font-medium w-12 text-center">{quantity}</span>
              <button onClick={() => setQuantity(q => Math.min(product.stockQuantity, q + 1))} className="px-4 py-3 hover:bg-gray-50 font-bold">+</button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.stockQuantity === 0 || addItem.isPending}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {addItem.isPending ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>

          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-bold mb-3">Specifications</h3>
              <dl className="grid grid-cols-2 gap-2">
                {Object.entries(product.attributes).map(([k, v]) => (
                  <div key={k} className="text-sm">
                    <dt className="text-gray-500 capitalize">{k}</dt>
                    <dd className="font-medium">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.description && (
            <div className="border-t pt-6 mt-4">
              <h3 className="font-bold mb-3">Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
