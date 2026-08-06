import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useGetDashboard, useGetGainsSnapshot, useGetAnnouncements } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/format';
import { useLocation } from 'wouter';
import { useSidebar } from '@/lib/sidebar-context';
import {
  Bell, Eye, EyeOff, ChevronRight, Menu,
  TrendingUp,
} from 'lucide-react';

function LiveGains({ snapshot }: { snapshot: { gainBalance: number; investmentBalance: number; dailyRatePercent: number; gainsActive: boolean; snapshotTime: string } }) {
  const [gains, setGains] = useState(snapshot.gainBalance);
  const [flipping, setFlipping] = useState(false);
  const prev = useRef(snapshot.gainBalance);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - new Date(snapshot.snapshotTime).getTime()) / 1000;
      const perSec = (snapshot.investmentBalance * snapshot.dailyRatePercent / 100) / 86400;
      const next = snapshot.gainBalance + (snapshot.gainsActive ? perSec * elapsed : 0);
      if (Math.abs(next - prev.current) > 0.0001) { setFlipping(true); setTimeout(() => setFlipping(false), 300); }
      prev.current = next;
      setGains(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [snapshot]);

  return (
    <span className={`text-3xl font-bold text-white ${flipping ? 'animate-number-flip' : ''}`} data-testid="text-gains-live">
      {formatCurrency(gains, 5)}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { open: openSidebar } = useSidebar();
  const [hideBalance, setHideBalance] = useState(false);

  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: snapshot } = useGetGainsSnapshot();
  const { data: announcements } = useGetAnnouncements();

  if (!user) return null;

  const maxCapital = dashboard?.settings?.maxCapital ?? 200000;
  const unreadCount = announcements?.length ?? 0;

  return (
    <>
      {/* ── Top bar ── */}
      <div className="bg-background px-4 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger */}
          <button
            onClick={openSidebar}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Bonjour, {user.name.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-muted-foreground">Fais fructifier ton investissement</p>
          </div>
        </div>

        {/* Bell → notifications page */}
        <button
          onClick={() => setLocation('/notifications')}
          className="relative w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </button>
      </div>

      <div className="px-4 pb-6 space-y-4">


        {/* ── Solde d'investissement ── */}
        <div className="gradient-green rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-xs font-semibold tracking-widest uppercase">Solde d'investissement</p>
              <div className="flex gap-1.5">
                <button onClick={() => setHideBalance(b => !b)} className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  {hideBalance ? <EyeOff className="w-3.5 h-3.5 text-white" /> : <Eye className="w-3.5 h-3.5 text-white" />}
                </button>
                <button onClick={() => setLocation('/transactions')} className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <ChevronRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-0.5" data-testid="text-investment-balance">
              {isLoading ? '...' : hideBalance ? '••••••' : formatCurrency(dashboard?.investmentBalance ?? 0)}
            </div>
            <p className="text-white/70 text-xs mb-3">Capital qui travaille pour vous</p>
            <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-0.5">
              <span className="text-white/90 text-xs">Maximum autorisé :</span>
              <span className="text-white font-bold text-xs">{formatCurrency(maxCapital)}</span>
            </div>
          </div>
        </div>

        {/* ── Gains en direct ── */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-semibold tracking-widest uppercase">Gains en direct</p>
            </div>

            {snapshot ? (
              <LiveGains snapshot={snapshot} />
            ) : (
              <span className="text-3xl font-bold text-white">
                {formatCurrency(dashboard?.referralEarnings ?? 0, 5)}
              </span>
            )}
            <p className="text-white/70 text-xs mt-0.5 mb-4">Solde retirable à tout moment</p>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setLocation('/withdraw')}
                className="bg-white text-purple-700 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-white/90 transition-colors"
                data-testid="button-withdraw-gains"
              >
                Retirer
              </button>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/80 text-xs">Gain en temps réel</span>
                </div>
                <p className="text-white/90 text-xs font-semibold">
                  Rendement : {snapshot?.dailyRatePercent ?? dashboard?.settings?.dailyRatePercent ?? 3}% / 24h
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
