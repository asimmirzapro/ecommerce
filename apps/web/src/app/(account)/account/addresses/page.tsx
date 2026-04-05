'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { toast } from 'sonner';
import { MapPin, Plus, Trash2, X } from 'lucide-react';

type Address = {
  id: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export default function AddressesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/users/addresses').then(r => r.data),
  });

  const add = useMutation({
    mutationFn: (data: any) => api.post('/users/addresses', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address added'); reset(); setShowForm(false); },
    onError: () => toast.error('Failed to add address'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/users/addresses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address removed'); },
    onError: () => toast.error('Failed to remove address'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Addresses</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Address'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(d => add.mutate(d))} className="bg-white border rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-800">New Address</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
            <input {...register('line1', { required: true })} className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400" placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input {...register('city', { required: true })} className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
              <input {...register('state')} className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input {...register('postalCode', { required: true })} className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input {...register('country', { required: true })} className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400" defaultValue="Pakistan" />
            </div>
          </div>
          <button type="submit" disabled={add.isPending} className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
            {add.isPending ? 'Saving...' : 'Save Address'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (addresses || []).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin className="w-16 h-16 mx-auto mb-4" />
          <p className="text-lg">No addresses saved</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(addresses || []).map((addr: Address) => (
            <div key={addr.id} className="bg-white border rounded-xl p-4 flex items-start justify-between">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{addr.line1}</p>
                  <p className="text-sm text-gray-500">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postalCode}</p>
                  <p className="text-sm text-gray-500">{addr.country}</p>
                  {addr.isDefault && <span className="text-xs text-orange-500 font-semibold">Default</span>}
                </div>
              </div>
              <button
                onClick={() => remove.mutate(addr.id)}
                disabled={remove.isPending}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
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
