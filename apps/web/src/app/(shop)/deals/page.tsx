'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';
import { Tag } from 'lucide-react';

export default function DealsPage() {
  const { data: deals, isLoading } = useQuery({
    queryKey: ['products', 'deals'],
    queryFn: () => api.get('/products/deals').then(r => r.data),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Tag className="w-8 h-8 text-red-500" />
        <div>
          <h1 className="text-3xl font-bold">Hot Deals</h1>
          <p className="text-gray-500">Limited time offers on top sports equipment</p>
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-gray-100 rounded-xl aspect-[3/4] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(deals || []).map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
