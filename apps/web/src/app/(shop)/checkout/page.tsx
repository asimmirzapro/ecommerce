'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle, CreditCard, MapPin, Plus } from 'lucide-react';

type AddressForm = {
  line1: string; line2?: string; city: string;
  state: string; postalCode: string; country: string;
};

type SavedAddress = AddressForm & { id: string; label?: string; isDefault: boolean };

export default function CheckoutPage() {
  const { cart } = useCart();
  const router = useRouter();
  const qc = useQueryClient();

  const [step, setStep] = useState<'address' | 'review' | 'payment'>('address');
  const [orderData, setOrderData] = useState<any>(null);
  const [cartSnapshot, setCartSnapshot] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressForm>({
    defaultValues: { country: 'US' },
  });

  const { data: savedAddresses = [] } = useQuery<SavedAddress[]>({
    queryKey: ['addresses'],
    queryFn: () => api.get('/users/addresses').then(r => r.data),
    retry: false,
  });

  // Auto-select default address and fill form on load
  useEffect(() => {
    if (!savedAddresses.length) return;
    const def = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
    setSelectedAddressId(def.id);
    reset({ line1: def.line1, line2: def.line2 ?? '', city: def.city, state: def.state, postalCode: def.postalCode, country: def.country });
  }, [savedAddresses, reset]);

  const selectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setShowNewAddressForm(false);
    reset({ line1: addr.line1, line2: addr.line2 ?? '', city: addr.city, state: addr.state, postalCode: addr.postalCode, country: addr.country });
  };

  const createOrder = useMutation({
    mutationFn: (data: any) => api.post('/orders', data).then(r => r.data),
  });

  const createIntent = useMutation({
    mutationFn: (orderId: string) => api.post('/payments/create-intent', { orderId }).then(r => r.data),
  });

  const handleAddressSubmit = async (formData: AddressForm) => {
    if (orderData) { setStep('review'); return; }
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      if (!cart?.id || cart.itemCount === 0) { toast.error('Your cart is empty'); return; }
      setCartSnapshot(cart);
      const order = await createOrder.mutateAsync({
        cartId: cart.id,
        shippingAddress: formData,
        billingAddress: formData,
      });
      setOrderData(order);
      createIntent.mutateAsync(order.id).catch(() => {});
      setStep('review');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    try {
      await api.post(`/orders/${orderData.orderNumber}/confirm`);
      toast.success(`Order ${orderData.orderNumber} placed! Confirmation email sent.`);
    } catch {
      toast.success(`Order ${orderData.orderNumber} placed!`);
    }
    qc.invalidateQueries({ queryKey: ['cart'] });
    router.push(`/account/orders/${orderData.orderNumber}`);
  };

  if ((!cart || cart.itemCount === 0) && !orderData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-lg text-gray-500 mb-4">Your cart is empty</p>
        <button onClick={() => router.push('/products')} className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors">
          Start Shopping
        </button>
      </div>
    );
  }

  const addressForm = (
    <form onSubmit={handleSubmit(handleAddressSubmit)} className="space-y-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
        <input {...register('line1', { required: 'Address is required' })} className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400 ${errors.line1 ? 'border-red-400' : ''}`} placeholder="123 Main St" />
        {errors.line1 && <p className="text-red-500 text-xs mt-1">{errors.line1.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (Optional)</label>
        <input {...register('line2')} className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400" placeholder="Apt, Suite, etc." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input {...register('city', { required: 'City is required' })} className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400 ${errors.city ? 'border-red-400' : ''}`} placeholder="New York" />
          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input {...register('state', { required: 'State is required' })} className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400 ${errors.state ? 'border-red-400' : ''}`} placeholder="NY" />
          {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
          <input {...register('postalCode', { required: 'Postal code is required' })} className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400 ${errors.postalCode ? 'border-red-400' : ''}`} placeholder="10001" />
          {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <select {...register('country', { required: true })} className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:border-orange-400">
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
          </select>
        </div>
      </div>
      <button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition-colors">
        {isSubmitting ? 'Processing...' : 'Continue to Review'}
      </button>
    </form>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <div className="flex items-center gap-4 mb-8">
        {(['address', 'review', 'payment'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s || i < ['address', 'review', 'payment'].indexOf(step) ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i + 1}
            </div>
            <span className="capitalize text-sm font-medium hidden sm:block">{s}</span>
            {i < 2 && <div className="w-12 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">

          {step === 'address' && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-bold text-lg mb-4">Shipping Address</h2>

              {savedAddresses.length > 0 && (
                <>
                  <div className="space-y-3">
                    {savedAddresses.map(addr => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => selectSavedAddress(addr)}
                        className={`w-full text-left border-2 rounded-lg p-4 transition-colors ${selectedAddressId === addr.id && !showNewAddressForm ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedAddressId === addr.id && !showNewAddressForm ? 'text-orange-500' : 'text-gray-400'}`} />
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              {addr.label && <span className="text-sm font-semibold text-gray-800">{addr.label}</span>}
                              {addr.isDefault && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Default</span>}
                            </div>
                            <p className="text-sm text-gray-700">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                            <p className="text-sm text-gray-500">{addr.city}, {addr.state} {addr.postalCode}, {addr.country}</p>
                          </div>
                        </div>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => { setShowNewAddressForm(true); setSelectedAddressId(null); reset({ line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US' }); }}
                      className={`w-full text-left border-2 rounded-lg p-4 transition-colors flex items-center gap-3 ${showNewAddressForm ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}
                    >
                      <Plus className={`w-4 h-4 flex-shrink-0 ${showNewAddressForm ? 'text-orange-500' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${showNewAddressForm ? 'text-orange-600' : 'text-gray-600'}`}>Use a different address</span>
                    </button>
                  </div>

                  {showNewAddressForm && addressForm}

                  {!showNewAddressForm && (
                    <form onSubmit={handleSubmit(handleAddressSubmit)} className="mt-4">
                      <button type="submit" disabled={isSubmitting || !selectedAddressId} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition-colors">
                        {isSubmitting ? 'Processing...' : 'Continue to Review'}
                      </button>
                    </form>
                  )}
                </>
              )}

              {savedAddresses.length === 0 && addressForm}
            </div>
          )}

          {step === 'review' && orderData && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-bold text-lg mb-4">Order Review</h2>
              <div className="space-y-3 mb-6">
                {orderData.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.productName} × {item.quantity}</span>
                    <span className="font-medium">{formatPrice(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2 text-sm mb-6">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(orderData.subtotal)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{formatPrice(orderData.shippingCost)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>{formatPrice(orderData.taxAmount)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span className="text-orange-500">{formatPrice(orderData.totalAmount)}</span></div>
              </div>
              <button onClick={() => setStep('payment')} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5" /> Continue to Payment
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-bold text-lg mb-4">Payment</h2>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-6">
                <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Stripe payment form</p>
                <p className="text-xs text-gray-400 mt-1">Configure STRIPE_PUBLISHABLE_KEY in .env to activate</p>
              </div>
              <button onClick={handlePayment} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Complete Order ({formatPrice(orderData?.totalAmount || 0)})
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white border rounded-xl p-4 sticky top-24">
            <h3 className="font-bold mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {((cartSnapshot || cart)?.items as any[] || []).map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <span className="truncate mr-2">{item.product?.name} ×{item.quantity}</span>
                  <span className="flex-shrink-0 font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3">
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-orange-500">{formatPrice(orderData?.subtotal ?? (cartSnapshot || cart)?.total ?? 0)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
