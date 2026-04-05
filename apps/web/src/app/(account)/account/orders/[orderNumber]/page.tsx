'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export default function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => api.get(`/orders/${orderNumber}`).then(r => r.data),
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/orders/${orderNumber}/cancel`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order', orderNumber] }); toast.success('Order cancelled'); },
    onError: () => toast.error('Cannot cancel this order'),
  });

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  if (!order) return <div className="text-center py-20">Order not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-gray-500 text-sm">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
          order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
          'bg-orange-100 text-orange-700'
        }`}>{order.status.replace(/_/g, ' ')}</span>
      </div>

      <div className="bg-white border rounded-xl p-6 mb-4">
        <h2 className="font-bold mb-4">Items</h2>
        <div className="space-y-4">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 py-3 border-b last:border-0">
              <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border">
                {item.productImageUrl ? (
                  <Image
                    src={item.productImageUrl}
                    alt={item.productName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.productName}</p>
                <p className="text-xs text-gray-400">SKU: {item.productSku}</p>
                <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity} × {formatPrice(item.unitPrice)}</p>
              </div>
              <p className="font-semibold text-sm">{formatPrice(item.totalPrice)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatPrice(order.shippingCost)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(order.taxAmount)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Total</span><span className="text-orange-500">{formatPrice(order.totalAmount)}</span></div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 mb-6">
        <h3 className="font-bold mb-2 text-sm">Shipping Address</h3>
        <p className="text-sm text-gray-600">
          {order.shippingAddress?.line1}<br />
          {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
        </p>
      </div>

      {['pending_payment', 'confirmed'].includes(order.status) && (() => {
        const canCancel = order.cancellableUntil && new Date() < new Date(order.cancellableUntil);
        const minutesLeft = order.cancellableUntil
          ? Math.max(0, Math.ceil((new Date(order.cancellableUntil).getTime() - Date.now()) / 60000))
          : 0;
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => canCancel && cancel.mutate()}
              disabled={cancel.isPending || !canCancel}
              title={!canCancel ? 'Orders can only be cancelled within 1 hour of placement' : undefined}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                !canCancel
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {cancel.isPending ? 'Cancelling...' : 'Cancel Order'}
            </button>
            {canCancel && (
              <span className="text-xs text-gray-400">
                {minutesLeft > 0 ? `${minutesLeft} min left to cancel` : 'Less than a minute left to cancel'}
              </span>
            )}
            {!canCancel && (
              <span className="text-xs text-gray-400">Cancellation window has passed</span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
