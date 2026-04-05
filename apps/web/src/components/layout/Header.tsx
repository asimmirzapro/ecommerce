'use client';
import Link from 'next/link';
import { ShoppingCart, Search, User, Menu, Package, LogOut } from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  useInactivityLogout();
  const { toggleCart, openMobileMenu } = useUIStore();
  const { user, isAuthenticated } = useAuthStore();
  const { logout } = useAuth();
  const { cart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const itemCount = cart?.itemCount || 0;

  return (
    <header className="sticky top-0 z-50 bg-[#1a1a2e] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-orange-400 flex-shrink-0">
            <Package className="w-6 h-6" />
            StylePK
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 max-w-2xl mx-auto">
            <div className="flex-1 flex bg-white rounded-lg overflow-hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for clothing, shoes, fragrances..."
                className="flex-1 px-4 py-2 text-gray-800 text-sm outline-none"
              />
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 px-4 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isAuthenticated ? (
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setAccountMenuOpen(o => !o)}
                  className="flex flex-col items-center text-xs hover:text-orange-400 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:block">{user?.firstName || 'Account'}</span>
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white text-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
                    <Link
                      href="/account"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-100 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      My Account
                    </Link>
                    <button
                      onClick={() => { setAccountMenuOpen(false); logout.mutate(); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="flex flex-col items-center text-xs hover:text-orange-400 transition-colors">
                <User className="w-5 h-5" />
                <span className="hidden sm:block">Sign In</span>
              </Link>
            )}

            <button onClick={itemCount > 0 ? toggleCart : undefined} className={`relative flex flex-col items-center text-xs transition-colors ${itemCount > 0 ? 'text-orange-400 hover:text-orange-400 cursor-pointer' : 'text-gray-400 cursor-default'}`}>
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:block">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            <button onClick={openMobileMenu} className="md:hidden">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6 pb-2 text-sm">
          <Link href="/products" className="hover:text-orange-400 transition-colors">All Products</Link>
          <Link href="/products?category=formal-wear" className="hover:text-orange-400 transition-colors">Formal Wear</Link>
          <Link href="/products?category=traditional-wear" className="hover:text-orange-400 transition-colors">Traditional</Link>
          <Link href="/products?category=casual-wear" className="hover:text-orange-400 transition-colors">Casual</Link>
          <Link href="/products?category=footwear" className="hover:text-orange-400 transition-colors">Footwear</Link>
          <Link href="/products?category=accessories" className="hover:text-orange-400 transition-colors">Accessories</Link>
          <Link href="/products?category=fragrances" className="hover:text-orange-400 transition-colors">Fragrances</Link>
          <Link href="/deals" className="text-orange-400 font-semibold hover:text-orange-300 transition-colors">Deals</Link>
          {user?.role === 'admin' && (
            <Link href="/admin" className="ml-auto text-yellow-400 hover:text-yellow-300 transition-colors">Admin</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
