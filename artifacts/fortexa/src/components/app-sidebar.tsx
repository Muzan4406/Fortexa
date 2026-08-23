import { useLocation } from 'wouter';
import { useSidebar } from '@/lib/sidebar-context';
import { useAuth } from '@/lib/auth-context';
import { Home, FileText, Network, User, X, LogOut, Shield } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',    icon: Home,     label: 'Accueil'                  },
  { href: '/referrals',    icon: Network,  image: '/team-icon.png', label: 'Communauté'               },
  { href: '/transactions', icon: FileText, image: '/withdrawal-clock-icon.png', label: 'Historique de transaction' },
  { href: '/profile',      icon: User,     label: 'Compte'                   },
];

/* Tiny star dot for the nocturnal header */
function Stars() {
  const pts = [
    [12, 10],[45, 6],[80, 18],[110, 8],[145, 22],[170, 5],[200, 14],[230, 9],[260, 20],[280, 7],
    [20, 35],[60, 28],[100, 42],[135, 30],[165, 48],[195, 33],[240, 44],[270, 38],
    [8,  58],[50, 52],[90, 65],[130, 55],[160, 70],[210, 60],[255, 66],[285, 50],
  ];
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 288 90" preserveAspectRatio="xMidYMid slice">
      {pts.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 4 === 0 ? 1.2 : 0.65} fill="white" opacity={i % 3 === 0 ? 0.5 : 0.25} />
      ))}
    </svg>
  );
}

export function AppSidebar() {
  const { isOpen, close } = useSidebar();
  const [location, setLocation] = useLocation();
  const { clearAuth, user } = useAuth();

  const navigate = (href: string) => { setLocation(href); close(); };
  const handleLogout = () => { close(); clearAuth(); setLocation('/login'); };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 backdrop-blur-sm ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#0b1d3a' }}
      >
        {/* ── Nocturnal Header ── */}
        <div
          className="px-5 pt-12 pb-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #102d5a 0%, #24132f 100%)' }}
        >
          <Stars />
          {/* Blue and pink glow */}
          <div
            className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.24) 0%, transparent 70%)' }}
          />
          {/* Subtle border */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.45), transparent)' }}
          />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/logo.jpg"
                alt="Fortexa"
                className="h-12 w-12 shrink-0 rounded-full border-2 border-pink-300/70 bg-white object-cover shadow-lg shadow-blue-950/30"
              />
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight truncate">
                  {user?.name ?? 'Utilisateur'}
                </p>
                <p
                  className="text-xs truncate max-w-[140px] mt-0.5"
                   style={{ color: 'rgba(191,219,254,0.82)' }}
                >
                  {user?.email ?? ''}
                </p>
                <div
                  className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                   style={{ background: 'rgba(244,114,182,0.14)', color: '#f9a8d4', border: '1px solid rgba(244,114,182,0.25)' }}
                >
                   <span className="w-1.5 h-1.5 rounded-full bg-pink-300 animate-pulse" />
                  Actif
                </div>
              </div>
            </div>
            <button
              onClick={close}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
        >
          {NAV_ITEMS.map(({ href, icon: Icon, image, label }) => {
            const isActive = location === href;
            return (
              <button
                key={href}
                onClick={() => navigate(href)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all ${
                  isActive ? '' : 'hover:bg-white/5'
                }`}
                style={isActive ? {
                   background: 'rgba(244,114,182,0.14)',
                   border: '1px solid rgba(244,114,182,0.28)',
                   color: '#f9a8d4',
                } : { color: 'rgba(255,255,255,0.5)', border: '1px solid transparent' }}
              >
                 {image ? (
                   <img src={image} alt="" className="h-5 w-5 shrink-0 object-contain" />
                 ) : (
                   <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                 )}
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              </button>
            );
          })}

          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:bg-amber-500/10"
              style={{ color: '#f59e0b', border: '1px solid transparent' }}
            >
              <Shield className="w-5 h-5 shrink-0" strokeWidth={2} />
              <span className="text-sm font-medium">Administration</span>
            </button>
          )}
        </nav>

        {/* ── Footer ── */}
        <div
          className="px-3 pb-8 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all hover:bg-red-500/10"
            style={{ color: 'rgba(239,68,68,0.8)', border: '1px solid transparent' }}
          >
            <LogOut className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className="text-sm font-medium">Se déconnecter</span>
          </button>
        </div>
      </aside>
    </>
  );
}
