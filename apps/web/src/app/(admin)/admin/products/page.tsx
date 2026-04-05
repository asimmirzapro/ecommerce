'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import Image from 'next/image';
import { Trash2, Search, Upload, Plus, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', page, search, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      return api.get(`/admin/products?${params}`).then(r => r.data);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'products'] }); toast.success('Product deleted'); },
    onError: () => toast.error('Failed to delete product'),
  });

  const bulkPublish = useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
      api.patch('/admin/products/bulk-publish', { ids, isActive }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      setSelected(new Set());
      toast.success(`${v.isActive ? 'Published' : 'Unpublished'} ${v.ids.length} product${v.ids.length > 1 ? 's' : ''}`);
    },
  });

  const products = data?.items || [];
  const allSelected = products.length > 0 && products.every((p: any) => selected.has(p.id));

  const toggleSelect = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(products.map((p: any) => p.id)));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/products/import"
            className="flex items-center gap-1.5 border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg px-3 py-2 text-sm font-medium transition-colors">
            <Upload className="w-4 h-4" /> Bulk Import
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or SKU..."
            className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-orange-400 w-full"
          />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive / Draft</option>
        </select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <button onClick={() => bulkPublish.mutate({ ids: [...selected], isActive: true })}
              className="flex items-center gap-1 text-xs bg-green-500 text-white rounded px-2.5 py-1.5 hover:bg-green-600 transition-colors">
              <Eye className="w-3.5 h-3.5" /> Publish
            </button>
            <button onClick={() => bulkPublish.mutate({ ids: [...selected], isActive: false })}
              className="flex items-center gap-1 text-xs bg-gray-500 text-white rounded px-2.5 py-1.5 hover:bg-gray-600 transition-colors">
              <EyeOff className="w-3.5 h-3.5" /> Unpublish
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Price</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Stock</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                No products found.{' '}
                <Link href="/admin/products/import" className="text-orange-500 hover:underline">Import some?</Link>
              </td></tr>
            ) : products.map((product: any) => {
              const img = product.images?.find((i: any) => i.isPrimary) || product.images?.[0];
              const isSelected = selected.has(product.id);
              return (
                <tr key={product.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-orange-50' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(product.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {img ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image src={getImageUrl(img.thumbnailUrl || img.url)} alt={product.name} fill className="object-cover" unoptimized />
                        </div>
                      ) : <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0" />}
                      <div>
                        <span className="font-medium truncate max-w-[200px] block">{product.name}</span>
                        {product.isFeatured && (
                          <span className="text-xs text-orange-500 font-medium">Featured</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{product.category?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{formatPrice(product.price)}</div>
                    {product.compareAtPrice && (
                      <div className="text-xs text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${product.stockQuantity === 0 ? 'text-red-500' : product.stockQuantity <= product.lowStockThreshold ? 'text-orange-500' : 'text-green-600'}`}>
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {product.isActive ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { if (window.confirm('Delete this product?')) deleteProduct.mutate(product.id); }}
                      className="text-red-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded text-sm ${page === p ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
