import Link from 'next/link';
import { Package } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#1a1a2e] text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 text-orange-400 font-bold text-xl mb-4">
              <Package className="w-6 h-6" />
              StylePK
            </div>
            <p className="text-sm">Your one-stop destination for premium clothing, traditional wear and fragrances.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/deals" className="hover:text-white transition-colors">Deals &amp; Offers</Link></li>
              <li><Link href="/products?sort=popularity" className="hover:text-white transition-colors">Best Sellers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/account/orders" className="hover:text-white transition-colors">My Orders</Link></li>
              <li><Link href="/account/returns" className="hover:text-white transition-colors">Returns</Link></li>
              <li><Link href="/account/profile" className="hover:text-white transition-colors">Profile</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Help</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="cursor-pointer hover:text-white transition-colors">Contact Us</span></li>
              <li><span className="cursor-pointer hover:text-white transition-colors">Shipping Info</span></li>
              <li><span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm">
          &copy; {new Date().getFullYear()} StylePK. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
