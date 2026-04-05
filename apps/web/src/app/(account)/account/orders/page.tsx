'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OrdersPage() {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then(r => r.data),
  });

  const deleteOrder = useMutation({
    mutationFn: (orderNumber: string) => api.delete(`/orders/${orderNumber}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted');
    },
    onError: () => toast.error('Failed to delete order'),
  });

  const clearAll = useMutation({
    mutationFn: () => api.delete('/orders'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('All orders cleared');
    },
    onError: () => toast.error('Failed to clear orders'),
  });

  const handleClearAll = () => {
    if (confirm('Delete all orders? This cannot be undone.')) {
      clearAll.mutate();
    }
  };

  const handleDelete = (e: React.MouseEvent, orderNumber: string) => {
    e.preventDefault();
    if (confirm(`Delete order ${orderNumber}?`)) {
      deleteOrder.mutate(orderNumber);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Link href="/products" className="text-sm text-orange-500 hover:text-orange-600">Continue Shopping</Link>
        </div>
        {(orders || []).length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearAll.isPending}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 disabled:opacity-50 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {clearAll.isPending ? 'Clearing...' : 'Clear all'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (orders || []).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4" />
          <p className="text-lg">No orders yet</p>
          <Link href="/products" className="text-orange-500 hover:text-orange-600 mt-2 inline-block">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(orders || []).map((order: any) => (
            <div key={order.id} className="relative group">
              <Link href={`/account/orders/${order.orderNumber}`} className="block bg-white border rounded-xl p-4 hover:shadow-md transition-shadow pr-12">
                {/* Order header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-500">{formatPrice(order.totalAmount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>{order.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                {/* Items with images */}
                <div className="flex flex-wrap gap-3">
                  {(order.items || []).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border">
                        {item.productImageUrl ? (
                          <Image
                            src={item.productImageUrl}
                            alt={item.productName}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight line-clamp-1 max-w-[160px]">{item.productName}</p>
                        <p className="text-xs text-gray-400">Qty: {item.quantity} · {formatPrice(item.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Link>
              <button
                onClick={(e) => handleDelete(e, order.orderNumber)}
                disabled={deleteOrder.isPending}
                className="absolute right-3 top-3 p-2 text-gray-300 hover:text-red-500 disabled:opacity-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete order"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
