'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ShoppingBag, Star } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatPrice, formatDate } from '@/lib/utils';

export default function AccountDashboard() {
  const { user } = useAuthStore();
  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then(r => r.data),
  });

  const recentOrders = (orders || []).slice(0, 5);

  return (
    <div>
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white rounded-xl p-6 mb-6">
        <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.firstName || 'Friend'}!</h1>
        <p className="text-gray-300 text-sm">{user?.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border rounded-xl p-4">
          <ShoppingBag className="w-8 h-8 text-orange-500 mb-2" />
          <p className="text-2xl font-bold">{(orders || []).length}</p>
          <p className="text-sm text-gray-500">Total Orders</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <Star className="w-8 h-8 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold">{(user as any)?.loyaltyPoints || 0}</p>
          <p className="text-sm text-gray-500">Loyalty Points</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Recent Orders</h2>
          <Link href="/account/orders" className="text-orange-500 text-sm hover:text-orange-600">View all</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-2" />
            <p>No orders yet</p>
            <Link href="/products" className="text-orange-500 hover:text-orange-600 text-sm mt-2 inline-block">Start shopping</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order: any) => (
              <Link key={order.id} href={`/account/orders/${order.orderNumber}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors border">
                <div>
                  <p className="font-medium text-sm">{order.orderNumber}</p>
                  <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{formatPrice(order.totalAmount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>{order.status.replace(/_/g, ' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
