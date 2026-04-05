'use client';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (user) reset({ firstName: user.firstName, lastName: user.lastName, email: user.email });
  }, [user, reset]);

  const update = useMutation({
    mutationFn: (data: any) => api.patch('/users/profile', data),
    onSuccess: () => toast.success('Profile updated'),
    onError: () => toast.error('Failed to update profile'),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <div className="bg-white border rounded-xl p-6">
        <form onSubmit={handleSubmit(d => update.mutate(d))} className="space-y-4 max-w-md">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input {...register('firstName')} className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input {...register('lastName')} className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input {...register('email')} type="email" disabled className="w-full border rounded-lg px-4 py-3 bg-gray-50 text-gray-400" />
          </div>
          <button type="submit" disabled={update.isPending} className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
            {update.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
