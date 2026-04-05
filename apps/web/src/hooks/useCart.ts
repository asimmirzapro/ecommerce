import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useUIStore } from '@/stores/ui.store';

export function useCart() {
  const qc = useQueryClient();
  const openCart = useUIStore(s => s.openCart);

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data),
    staleTime: 30_000,
  });

  const addItem = useMutation({
    mutationFn: (data: { productId: string; variantId?: string; quantity: number }) =>
      api.post('/cart/items', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      openCart();
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.patch(`/cart/items/${itemId}`, { quantity }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.delete(`/cart/items/${itemId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  return { cart, isLoading, addItem, updateItem, removeItem };
}
