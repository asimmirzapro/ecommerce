import Link from 'next/link';
import { Package } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex flex-col">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 text-orange-400 font-bold text-xl">
          <Package className="w-6 h-6" />
          StylePK
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
