'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function AdminCustomersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: () => api.get('/admin/customers').then(r => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Customers</h1>
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Points</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-10 bg-gray-100 rounded animate-pulse" /></td></tr>)
            ) : (data?.items || []).map((customer: any) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                      {(customer.firstName?.[0] || customer.email[0]).toUpperCase()}
                    </div>
                    <span className="font-medium">{customer.firstName} {customer.lastName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{customer.email}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(customer.createdAt)}</td>
                <td className="px-4 py-3">{customer.loyaltyPoints}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${customer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
