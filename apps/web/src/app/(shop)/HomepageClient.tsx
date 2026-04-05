'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Zap, Shield, Truck, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';
import { formatPrice, getImageUrl } from '@/lib/utils';

export default function HomepageClient() {
  const { data: featured } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/products/featured').then(r => r.data),
  });

  const { data: trending } = useQuery({
    queryKey: ['products', 'trending'],
    queryFn: () => api.get('/products/trending').then(r => r.data),
  });

  const { data: deals } = useQuery({
    queryKey: ['products', 'deals'],
    queryFn: () => api.get('/products/deals').then(r => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-orange-500 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-blue-500 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-2xl">
            <span className="inline-block bg-orange-500 text-white text-sm font-semibold px-3 py-1 rounded-full mb-4">
              New Season Collection
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
              Dress With
              <span className="text-orange-400"> Style</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Premium clothing, traditional Pakistani attire, footwear and fragrances. Shop our latest collection.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/products" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2">
                Shop Now <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/deals" className="border-2 border-white/30 hover:border-orange-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
                View Deals
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-orange-500 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Truck, label: 'Free Shipping', sub: 'Orders over $50' },
            { icon: RotateCcw, label: 'Easy Returns', sub: '30-day returns' },
            { icon: Shield, label: 'Secure Payment', sub: 'SSL protected' },
            { icon: Zap, label: 'Fast Delivery', sub: '2-3 business days' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-orange-100">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Shop by Category</h2>
            <Link href="/products" className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1">
              All categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.slice(0, 6).map((cat: any) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden block"
              >
                {/* Background image */}
                {cat.imageUrl ? (
                  <Image
                    src={getImageUrl(cat.imageUrl)}
                    alt={cat.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/0 group-hover:from-black/80 transition-all duration-300" />
                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-sm leading-tight drop-shadow">{cat.name}</p>
                  <p className="text-white/70 text-xs mt-0.5 flex items-center gap-0.5 group-hover:text-orange-300 transition-colors">
                    Shop now <ArrowRight className="w-3 h-3" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featured && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <Link href="/products?sort=rating" className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Deals Banner */}
      {deals && deals.length > 0 && (
        <section className="bg-gradient-to-r from-red-600 to-orange-600 py-12 px-4 my-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Hot Deals</h2>
                <p className="text-orange-100 text-sm">Limited time offers</p>
              </div>
              <Link href="/deals" className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors">
                All Deals
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {deals.slice(0, 4).map((p: any) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="relative aspect-square">
                    {p.images?.[0] && (
                      <Image src={getImageUrl(p.images[0].thumbnailUrl || p.images[0].url)} alt={p.name} fill className="object-cover" />
                    )}
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      -{Math.round((1 - p.price / p.compareAtPrice) * 100)}%
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2 group-hover:text-orange-500 transition-colors">{p.name}</p>
                    <p className="font-bold text-orange-500">{formatPrice(p.price)}</p>
                    <p className="text-xs text-gray-400 line-through">{formatPrice(p.compareAtPrice)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending */}
      {trending && trending.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Trending Now</h2>
            <Link href="/products?sort=popularity" className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {trending.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
