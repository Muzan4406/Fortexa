import { useLocation } from 'wouter';
import { useSidebar } from '@/lib/sidebar-context';
import { useAuth } from '@/lib/auth-context';
import {
  Home, FileText, Users, X, LogOut, Bell, Settings, Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',     icon: Home,     label: 'Tableau de bord' },
  { href: '/transactions',  icon: FileText, label: 'Historique'       },
  { href: '/referrals',     icon: Users,    label: 'Mon équipe'       },
  { href: '/notifications', icon: Bell,     label: 'Notifications'    },
];

export function AppSidebar() {
  const { isOpen, close } = useSidebar();
  const [location, setLocation] = useLocation();
  const { clearAuth, user } = useAuth();

  const navigate = (href: string) => {
    setLocation(href);
    close();
  };

  const handleLogout = () => {
    close();
    clearAuth();
    setLocation('/login');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-card z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="gradient-green px-5 pt-12 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Fortexa"
              className="w-11 h-11 rounded-full object-cover border-2 border-white/30"
            />
            <div>
              <p className="text-white font-bold text-base leading-tight">{user?.name ?? 'Utilisateur'}</p>
              <p className="text-white/70 text-xs truncate max-w-[140px]">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = location === href;
            return (
              <button
                key={href}
                onClick={() => navigate(href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              </button>
            );
          })}

          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-amber-600 hover:bg-amber-50 transition-all"
            >
              <Shield className="w-5 h-5 shrink-0" strokeWidth={2} />
              <span className="text-sm font-medium">Administration</span>
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-8 pt-2 border-t border-border space-y-1">
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Settings className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className="text-sm font-medium">Paramètres</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className="text-sm font-medium">Se déconnecter</span>
          </button>
        </div>
      </aside>
    </>
  );
}
