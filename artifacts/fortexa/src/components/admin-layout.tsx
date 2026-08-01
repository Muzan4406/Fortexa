import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { LayoutDashboard, Users, ArrowDownCircle, ArrowUpCircle, Settings, ChevronLeft } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/deposits', label: 'Dépôts', icon: ArrowDownCircle },
  { href: '/admin/withdrawals', label: 'Retraits', icon: ArrowUpCircle },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center h-14 gap-3">
          <button onClick={() => setLocation('/dashboard')} className="p-1 rounded-lg hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-white/20" />
          <span className="font-bold text-lg tracking-tight">Fortexa</span>
          <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">Admin</span>
          <div className="flex-1" />
          <span className="text-white/70 text-sm font-medium">{title}</span>
        </div>
        {/* Sub-nav */}
        <div className="max-w-5xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 pb-0">
            {NAV.map(({ href, label, icon: Icon }) => {
              const isActive = location === href;
              return (
                <button
                  key={href}
                  onClick={() => setLocation(href)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-amber-400 text-amber-400'
                      : 'border-transparent text-white/60 hover:text-white/90'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
