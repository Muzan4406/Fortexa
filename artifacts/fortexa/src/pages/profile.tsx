import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';
import {
  ArrowDownCircle, ArrowUpCircle, ChevronRight,
  Shield, Headphones, Info, LogOut, Menu,
} from 'lucide-react';
import { useSidebar } from '@/lib/sidebar-context';

export default function ProfilePage() {
  const { clearAuth, user } = useAuth();
  const [, setLocation] = useLocation();
  const { open: openSidebar } = useSidebar();

  const handleLogout = () => {
    clearAuth();
    setLocation('/login');
  };

  return (
    <>
      {/* ── Header : logo + nom ── */}
      <div className="gradient-green px-5 pt-10 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />

        {/* hamburger */}
        <button
          onClick={openSidebar}
          className="absolute top-10 left-5 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        <div className="relative flex flex-col items-center pt-2">
          <img
            src="/logo.jpg"
            alt="Fortexa"
            className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-lg mb-3"
          />
          <h1 className="text-xl font-bold text-white">{user?.name ?? '...'}</h1>
          <p className="text-white/60 text-sm">{user?.email ?? ''}</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-3">

        {/* ── Dépôt / Retrait ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation('/deposit')}
            className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center shadow-sm">
              <ArrowDownCircle className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold text-foreground">Déposer</span>
          </button>
          <button
            onClick={() => setLocation('/withdraw')}
            className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-sm">
              <ArrowUpCircle className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold text-foreground">Retirer</span>
          </button>
        </div>

        {/* ── Admin ── */}
        {user?.role === 'admin' && (
          <button
            onClick={() => setLocation('/admin')}
            className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-amber-900">Administration</p>
                <p className="text-xs text-amber-700">Accès panneau admin</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600" />
          </button>
        )}

        {/* ── Service client ── */}
        <button
          onClick={() => setLocation('/support')}
          className="w-full bg-card rounded-2xl p-4 border border-border flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#229ED9]/10 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-[#229ED9]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Service client</p>
              <p className="text-xs text-muted-foreground">Canal & support Telegram</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* ── À propos ── */}
        <button
          onClick={() => setLocation('/about')}
          className="w-full bg-card rounded-2xl p-4 border border-border flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">À propos de nous</p>
              <p className="text-xs text-muted-foreground">Notre mission et nos valeurs</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* ── Déconnexion ── */}
        <button
          onClick={handleLogout}
          className="w-full bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center justify-center gap-2 text-destructive font-medium"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>
      </div>
    </>
  );
}
