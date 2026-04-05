'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Package, ShoppingBag, Users, RotateCcw, Tag, Home } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: BarChart2 },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/returns', label: 'Returns', icon: RotateCcw },
  { href: '/admin/promotions', label: 'Promotions', icon: Tag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') router.push('/login');
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-[#1a1a2e] text-white flex-shrink-0 fixed h-full overflow-y-auto">
        <div className="p-4 border-b border-white/10">
          <Link href="/" className="text-orange-400 font-bold text-lg">StylePK Admin</Link>
        </div>
        <nav className="p-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${pathname === href ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <div className="border-t border-white/10 mt-4 pt-4">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
              <Home className="w-4 h-4" /> Back to Store
            </Link>
          </div>
        </nav>
      </aside>
      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  );
}
