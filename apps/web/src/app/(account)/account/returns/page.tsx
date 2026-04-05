'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-orange-100 text-orange-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function ReturnsPage() {
  const { data: returns, isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: () => api.get('/returns').then(r => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Returns</h1>
      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (returns || []).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <RotateCcw className="w-16 h-16 mx-auto mb-4" />
          <p className="text-lg">No returns yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(returns || []).map((ret: any) => (
            <div key={ret.id} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold">Return #{ret.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-sm text-gray-500">{formatDate(ret.createdAt)} · {ret.reason}</p>
                </div>
                <div className="text-right">
                  {ret.refundAmount && <p className="font-bold text-orange-500">{formatPrice(ret.refundAmount)}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[ret.status] || 'bg-gray-100 text-gray-700'}`}>
                    {ret.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
