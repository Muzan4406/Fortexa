import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useGetDashboard, useGetGainsSnapshot, useGetAnnouncements, useGetUsdtInfo, getGetUsdtInfoQueryKey } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/format';
import { isFcfaCountry } from '@/lib/countries';
import { useLocation } from 'wouter';
import { useSidebar } from '@/lib/sidebar-context';
import { Bell, Eye, EyeOff, ChevronRight, Menu, TrendingUp, Zap } from 'lucide-react';

/* ── Constellation background SVG ── */
function StarField({ className }: { className?: string }) {
  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ''}`} viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice">
      {[
        [20,15],[60,8],[120,20],[200,12],[260,25],[290,5],
        [45,50],[90,35],[155,42],[230,38],[275,55],
        [10,80],[70,70],[140,90],[210,75],[280,85],
        [35,120],[100,110],[170,130],[245,115],[295,125],
        [55,160],[115,150],[180,170],[250,155],[285,175],
        [25,190],[80,185],[150,195],[220,188],[270,192],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 5 === 0 ? 1.2 : 0.7} fill="white" opacity={i % 3 === 0 ? 0.6 : 0.3} />
      ))}
    </svg>
  );
}

/* ── Live gains counter (server snapshot + local interpolation) ── */
function LiveGains({ snapshot, currency = 'xof', usdtRate }: {
  snapshot: {
    gainBalance: number;
    investmentBalance: number;
    dailyRatePercent: number;
    gainsActive: boolean;
    snapshotTime: string;
  };
  currency?: 'xof' | 'usdt';
  usdtRate?: number;
}) {
  const [gains, setGains] = useState(snapshot.gainBalance);
  const [flipping, setFlipping] = useState(false);
  const prev = useRef(snapshot.gainBalance);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - new Date(snapshot.snapshotTime).getTime()) / 1000;
      const perSec = (snapshot.investmentBalance * snapshot.dailyRatePercent / 100) / 86400;
      const next = snapshot.gainBalance + (snapshot.gainsActive ? perSec * elapsed : 0);
      if (Math.abs(next - prev.current) > 0.0001) {
        setFlipping(true);
        setTimeout(() => setFlipping(false), 300);
      }
      prev.current = next;
      setGains(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [snapshot]);

  const displayGains = currency === 'usdt' ? `${(gains / (usdtRate || 655)).toFixed(6)} USDT` : formatCurrency(gains, 5);
  return (
    <span
      className={`text-3xl font-bold text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.25)] ${flipping ? 'animate-number-flip' : ''}`}
      data-testid="text-gains-live"
    >
      {displayGains}
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
  const isXof = isFcfaCountry(user?.country ?? '');
  const { data: usdtInfo } = useGetUsdtInfo({
    query: { enabled: !!user && !isXof, queryKey: getGetUsdtInfoQueryKey() },
  });
  const usdtRate = usdtInfo?.usdtRate || 655;

  if (!user) return null;

  const maxCapital = dashboard?.settings?.maxCapital ?? 200000;
  const unreadCount = announcements?.length ?? 0;
  const dailyRate = snapshot?.dailyRatePercent ?? dashboard?.settings?.dailyRatePercent ?? 3;
  const displayAmount = (amount: number, decimals = 2) =>
    isXof ? formatCurrency(amount, decimals) : `${(amount / usdtRate).toFixed(6)} USDT`;

  return (
    <div className="min-h-[100dvh] overflow-y-auto overscroll-y-contain bg-background pb-8">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between bg-background px-4 pb-5 pt-8">
        <div className="flex items-center gap-3">
          <button
            onClick={openSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
               Bonjour, {user.name.split(' ')[0]}
            </h1>
            <p className="text-xs text-muted-foreground">Fais fructifier ton investissement</p>
          </div>
        </div>
        <button
          onClick={() => setLocation('/notifications')}
           className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </button>
      </div>

      <div className="px-4 pb-6 space-y-4">

        {/* ── Solde d'investissement — Nocturnal gold card ── */}
        <div
           className="rounded-2xl p-5 relative overflow-hidden border border-blue-200 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 60%, #dbeafe 100%)' }}
        >
          <StarField />
          {/* Glowing orb top-right */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.16) 0%, transparent 70%)' }}
          />
          {/* Subtle gold border */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.16)' }} />

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
               <p className="text-blue-700 text-xs font-semibold tracking-widest uppercase">
                Solde d'investissement
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setHideBalance(b => !b)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ background: 'rgba(59,130,246,0.1)' }}
                >
                  {hideBalance
                     ? <EyeOff className="w-3.5 h-3.5 text-blue-600" />
                     : <Eye className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <button
                  onClick={() => setLocation('/transactions')}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(59,130,246,0.1)' }}
                >
                    <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
            </div>

            <div
               className="text-3xl font-bold mb-0.5"
                style={{ color: '#be123c' }}
              data-testid="text-investment-balance"
            >
               {isLoading ? '...' : hideBalance ? '••••••' : displayAmount(dashboard?.investmentBalance ?? 0)}
            </div>
             <p className="text-blue-800/70 text-xs mb-3">Capital qui travaille pour vous</p>

            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}
            >
                 <span className="text-blue-800/80 text-xs">Maximum autorisé :</span>
                  <span className="text-blue-900 font-bold text-xs">{displayAmount(maxCapital, 0)}</span>
            </div>
          </div>
        </div>

        {/* ── Gains en direct — Nocturnal emerald card ── */}
        <div
            className="rounded-2xl p-5 relative overflow-hidden border border-sky-200 shadow-sm"
             style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 50%, #e0f2fe 100%)' }}
        >
          <StarField />
          {/* Green glow orb */}
          <div
            className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-0 left-0 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)' }}
          />
          {/* Emerald border */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(14,165,233,0.16)' }} />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ background: 'rgba(244,63,94,0.1)' }}
              >
                 <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <p className="text-rose-600 text-xs font-semibold tracking-widest uppercase">Gains en direct</p>
            </div>

            {snapshot ? (
               <LiveGains snapshot={snapshot} currency={isXof ? 'xof' : 'usdt'} usdtRate={usdtRate} />
            ) : (
                <span className="text-3xl font-bold text-rose-600" data-testid="text-gains-live">
                {displayAmount(dashboard?.referralEarnings ?? 0, 5)}
              </span>
            )}
             <p className="text-rose-700/70 text-xs mt-0.5 mb-4">Solde retirable à tout moment</p>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setLocation('/withdraw')}
                className="font-semibold text-sm px-5 py-2 rounded-xl transition-all"
                style={{
                   background: 'linear-gradient(135deg, #e11d48, #ec4899)',
                  color: '#fff',
                   boxShadow: '0 0 16px rgba(225,29,72,0.25)',
                }}
                data-testid="button-withdraw-gains"
              >
                Retirer
              </button>

              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end mb-0.5">
                   <Zap className="w-3 h-3 text-rose-500" />
                    <span className="text-rose-700/70 text-xs">Temps réel</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                </div>
                 <p className="text-rose-500/80 text-xs font-semibold">
                   {dailyRate}% / 24h
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-[#eff6ff] via-[#f8fbff] to-[#e0e7ff] p-4 shadow-sm">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-300/20 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <img src="/dashboard-investment-icon.png" alt="" className="h-20 w-20 shrink-0 object-contain drop-shadow-[0_0_18px_rgba(244,63,95,.2)]" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500/80">Votre argent travaille</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Investissez avec confiance</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Suivez votre capital et vos gains en temps réel.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
