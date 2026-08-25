import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useGetDashboard, useGetGainsSnapshot, useGetAnnouncements, useGetUsdtInfo, getGetUsdtInfoQueryKey } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/format';
import { isFcfaCountry } from '@/lib/countries';
import { useLocation } from 'wouter';
import { Bell, Eye, EyeOff, ChevronRight, TrendingUp, Zap, BarChart3, ShieldCheck, Clock3, Award, User } from 'lucide-react';

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
    <div
      className="fixed inset-0 z-0 h-[100dvh] overflow-y-scroll overscroll-y-auto bg-background pb-24"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between bg-background px-4 pb-3 pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/fortexa-dashboard-logo.png"
            alt="Fortexa"
            className="h-10 w-10 shrink-0 rounded-full object-contain drop-shadow-sm"
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-foreground">
               Bonjour, {user.name.split(' ')[0]}
            </h1>
            <p className="truncate text-xs text-muted-foreground">Fais fructifier ton investissement</p>
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

         {/* ── Solde d'investissement ── */}
        <div
            className="rounded-2xl p-4 relative overflow-hidden border border-blue-200 shadow-sm"
             style={{ background: 'linear-gradient(135deg, #071b58 0%, #123b9b 62%, #1e4fb6 100%)' }}
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
                <p className="text-white/90 text-xs font-semibold tracking-widest uppercase">
                Solde d'investissement
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setHideBalance(b => !b)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ background: 'rgba(59,130,246,0.1)' }}
                >
                  {hideBalance
                      ? <EyeOff className="w-3.5 h-3.5 text-white" />
                      : <Eye className="w-3.5 h-3.5 text-white" />}
                </button>
                <button
                  onClick={() => setLocation('/transactions')}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(59,130,246,0.1)' }}
                >
                     <ChevronRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

             <div className="flex items-center justify-between gap-2">
               <div>
                 <div
                   className="text-3xl font-bold mb-0.5"
                 style={{ color: '#ffffff' }}
                   data-testid="text-investment-balance"
                 >
                   {isLoading ? '...' : hideBalance ? '••••••' : displayAmount(dashboard?.investmentBalance ?? 0)}
                 </div>
                  <p className="text-blue-100/80 text-xs mb-2">Capital qui travaille pour vous</p>
               </div>
               <img src="/safe-transparent.png" alt="" className="h-24 w-24 shrink-0 object-contain drop-shadow-[0_8px_12px_rgba(30,64,175,.2)]" />
             </div>

            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
                  <span className="text-blue-100/80 text-xs">Maximum autorisé :</span>
                   <span className="text-white font-bold text-xs">{displayAmount(maxCapital, 0)}</span>
            </div>
          </div>
        </div>

         {/* ── Gains en direct ── */}
        <div
            className="rounded-2xl p-4 relative overflow-hidden border border-rose-200 shadow-sm"
             style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff5f7 52%, #ffe4ec 100%)' }}
        >
          <StarField />
          {/* Green glow orb */}
          <div
            className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.15) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-0 left-0 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 70%)' }}
          />
          {/* Emerald border */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(244,63,94,0.14)' }} />

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

             <div className="flex items-center justify-between gap-2">
               <div>
                 {snapshot ? (
                    <LiveGains snapshot={snapshot} currency={isXof ? 'xof' : 'usdt'} usdtRate={usdtRate} />
                 ) : (
                     <span className="text-3xl font-bold text-rose-600" data-testid="text-gains-live">
                      {displayAmount(dashboard?.gainBalance ?? 0, 5)}
                   </span>
                 )}
                 <p className="text-rose-700/70 text-xs mt-0.5 mb-2">Solde retirable à tout moment</p>
               </div>
               <img src="/wallet-transparent.png" alt="" className="h-24 w-24 shrink-0 object-contain drop-shadow-[0_8px_12px_rgba(190,24,93,.18)]" />
             </div>

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

         <div className="grid grid-cols-4 gap-2">
             {[
             { label: 'Accueil', sub: 'Vue d’ensemble', image: '/home-icon.png', color: 'bg-blue-50', href: '/dashboard' },
             { label: 'Communauté', sub: 'Inviter et gagner', image: '/team-icon.png', color: 'bg-violet-50', href: '/referrals' },
             { label: 'Historique', sub: 'Vos transactions', image: '/withdrawal-clock-icon.png', color: 'bg-emerald-50', href: '/transactions' },
             { label: 'Compte', sub: 'Gérer votre compte', icon: User, color: 'bg-slate-100', href: '/profile' },
           ].map(({ label, sub, image, icon: Icon, color, href }) => (
             <button key={label} onClick={() => setLocation(href)} className="min-w-0 rounded-2xl border border-slate-100 bg-white px-1 py-2.5 text-center shadow-sm transition-transform active:scale-95">
               <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>
                 {image ? <img src={image} alt="" className="h-7 w-7 object-contain" /> : Icon ? <Icon className="h-5 w-5 text-slate-600" /> : null}
               </span>
               <span className="mt-2 block truncate text-[11px] font-bold text-slate-900">{label}</span>
               <span className="mt-0.5 block truncate text-[9px] text-slate-500">{sub}</span>
             </button>
           ))}
         </div>

         <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-[#071b58] p-3 shadow-sm">
           <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
           <div className="relative flex items-center gap-3">
             <img src="/dashboard-investment-icon.png" alt="" className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_0_14px_rgba(244,63,95,.35)]" />
             <div className="min-w-0">
               <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Votre argent travaille</p>
               <p className="mt-1 text-sm font-semibold text-white">Investissez avec confiance</p>
               <p className="mt-0.5 text-xs leading-relaxed text-blue-100/75">Regardez vos gains grandir chaque jour.</p>
             </div>
           </div>
         </div>

         <div className="grid grid-cols-4 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white px-1 py-3 shadow-sm">
           {[
             { label: '3%', text: 'Rendement\\ntoutes les 24h', icon: BarChart3, color: 'bg-blue-50 text-blue-600' },
             { label: 'Sécurisé', text: 'Plateforme\\n100% sécurisée', icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-600' },
             { label: 'Temps réel', text: 'Gains calculés\\nen temps réel', icon: Clock3, color: 'bg-violet-50 text-violet-600' },
             { label: 'Fiable', text: 'Transparence et\\nconfiance', icon: Award, color: 'bg-amber-50 text-amber-600' },
           ].map(({ label, text, icon: Icon, color }) => (
             <div key={label} className="min-w-0 px-1 text-center">
               <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${color}`}>
                 <Icon className="h-4 w-4" />
               </span>
               <p className="mt-2 truncate text-[11px] font-bold text-slate-900">{label}</p>
               <p className="mt-0.5 whitespace-pre-line text-[9px] leading-tight text-slate-500">{text}</p>
             </div>
           ))}
         </div>

      </div>
    </div>
  );
}
