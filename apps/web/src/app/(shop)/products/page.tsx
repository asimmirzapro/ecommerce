'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Filter, SlidersHorizontal } from 'lucide-react';
import api from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';
import { Suspense } from 'react';

function ProductsContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const [sort, setSort] = useState(sp.get('sort') || 'newest');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (sp.get('q')) params.set('q', sp.get('q')!);
  if (sp.get('category')) params.set('category', sp.get('category')!);
  if (sort !== 'newest') params.set('sort', sort);
  params.set('page', String(page));
  params.set('limit', '20');

  const { data, isLoading } = useQuery({
    queryKey: ['products', sp.toString(), sort, page],
    queryFn: () => api.get(`/products?${params.toString()}`).then(r => r.data),
    staleTime: 30_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });

  const activeCategory = sp.get('category');

  const setCategory = (slug: string | null) => {
    const newSp = new URLSearchParams(sp.toString());
    if (slug) newSp.set('category', slug);
    else newSp.delete('category');
    newSp.delete('page');
    router.push(`/products?${newSp.toString()}`);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 flex-shrink-0">
          <div className="bg-white border rounded-xl p-4 sticky top-24">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </h3>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Category</p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setCategory(null)}
                    className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${!activeCategory ? 'bg-orange-50 text-orange-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    All Products
                  </button>
                </li>
                {(categories || []).map((cat: any) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setCategory(cat.slug)}
                      className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${activeCategory === cat.slug ? 'bg-orange-50 text-orange-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {sp.get('q') ? `Search: "${sp.get('q')}"` : activeCategory || 'All Products'}
              </h1>
              {data && <p className="text-sm text-gray-500">{data.total} products</p>}
            </div>
            <select
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="popularity">Best Selling</option>
            </select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : data?.items?.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No products found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(data?.items || []).map((p: any) => <ProductCard key={p.id} product={p} />)}
              </div>
              {data?.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-orange-500 text-white' : 'bg-white border hover:bg-gray-50'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50" />}><ProductsContent /></Suspense>;
}
