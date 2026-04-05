'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { TrendingUp, ShoppingBag, Users, AlertTriangle, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Link from 'next/link';

export default function AdminDashboard() {
  const { data: kpi } = useQuery({
    queryKey: ['admin', 'kpi'],
    queryFn: () => api.get('/admin/reports/kpi').then(r => r.data),
    staleTime: 60_000,
  });

  const { data: salesData } = useQuery({
    queryKey: ['admin', 'sales'],
    queryFn: () => api.get('/admin/reports/sales').then(r => r.data),
    staleTime: 60_000,
  });

  const { data: topProducts } = useQuery({
    queryKey: ['admin', 'top-products'],
    queryFn: () => api.get('/admin/reports/products').then(r => r.data),
    staleTime: 60_000,
  });

  const { data: lowStock } = useQuery({
    queryKey: ['admin', 'low-stock'],
    queryFn: () => api.get('/admin/reports/low-stock').then(r => r.data),
    staleTime: 60_000,
  });

  const kpiCards = [
    { label: 'Revenue (30d)', value: formatPrice(kpi?.totalRevenue || 0), change: kpi?.revenueChange, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Orders (30d)', value: kpi?.totalOrders || 0, change: kpi?.ordersChange, icon: ShoppingBag, color: 'text-blue-500' },
    { label: 'New Customers', value: kpi?.newCustomers || 0, icon: Users, color: 'text-purple-500' },
    { label: 'Avg Order Value', value: formatPrice(kpi?.averageOrderValue || 0), icon: BarChart2, color: 'text-orange-500' },
  ];

  const chartData = (salesData || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: Number(d.total_revenue),
    orders: Number(d.total_orders),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-gray-500">Last 30 days</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 font-medium">{label}</p>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-extrabold">{value}</p>
            {change !== undefined && (
              <p className={`text-xs mt-1 ${Number(change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {Number(change) >= 0 ? '↑' : '↓'} {Math.abs(Number(change))}% vs prev period
              </p>
            )}
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border rounded-xl p-6">
            <h2 className="font-bold mb-4">Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatPrice(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="#fed7aa" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border rounded-xl p-6">
            <h2 className="font-bold mb-4">Daily Orders</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Top Products</h2>
            <Link href="/admin/products" className="text-orange-500 text-sm hover:text-orange-600">View all</Link>
          </div>
          <div className="space-y-3">
            {(topProducts || []).slice(0, 5).map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-400 w-5">#{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.soldCount} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-bold flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> Low Stock Alerts
          </h2>
          {(lowStock || []).length === 0 ? (
            <p className="text-sm text-gray-400">All products are well stocked</p>
          ) : (
            <div className="space-y-3">
              {(lowStock || []).slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate mr-2">{p.name}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${p.stockQuantity === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {p.stockQuantity === 0 ? 'Out' : `${p.stockQuantity} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
