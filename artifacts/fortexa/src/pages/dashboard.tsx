import { useState, useEffect, useRef } from 'react';
import { UserLayout } from '@/components/user-layout';
import { useAuth } from '@/lib/auth-context';
import { useGetDashboard, useGetGainsSnapshot, useGetTransactions, useGetAnnouncements } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { useLocation } from 'wouter';
import {
  Bell, Eye, EyeOff, ChevronRight, ArrowDownCircle, ArrowUpCircle,
  Users, FileText, TrendingUp, Gift, AlertCircle,
  ArrowDownCircle as DepositIcon,
} from 'lucide-react';
import type { Transaction } from '@workspace/api-client-react';

const TX_CONFIG = {
  deposit:    { label: 'Dépôt',       color: 'text-green-600',  bg: 'bg-green-100',  sign: '+' },
  withdrawal: { label: 'Retrait',     color: 'text-red-500',    bg: 'bg-red-100',    sign: '-' },
  commission: { label: 'Commission',  color: 'text-blue-600',   bg: 'bg-blue-100',   sign: '+' },
  gain:       { label: 'Gain',        color: 'text-primary',    bg: 'bg-primary/10', sign: '+' },
} as const;

const STATUS_LABEL: Record<string, string> = {
  pending:  'En cours',
  approved: 'Validé',
  rejected: 'Rejeté',
};
const STATUS_COLOR: Record<string, string> = {
  pending:  'text-amber-500',
  approved: 'text-green-600',
  rejected: 'text-red-500',
};

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
  const [hideBalance, setHideBalance] = useState(false);

  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: snapshot } = useGetGainsSnapshot();
  const { data: txList } = useGetTransactions({});
  const { data: announcements } = useGetAnnouncements();

  if (!user) return null;

  const recentTx = (txList?.items ?? []).slice(0, 3);
  const maxCapital = dashboard?.settings?.maxCapital ?? 200000;

  return (
    <UserLayout>
      {/* ── Top bar ── */}
      <div className="bg-background px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Bonjour, {user.name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Fais fructifier ton investissement</p>
        </div>
        <button className="relative w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Bell className="w-5 h-5 text-foreground" />
          {announcements && announcements.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          )}
        </button>
      </div>

      <div className="px-4 pb-6 space-y-4">

        {/* ── Annonce ── */}
        {announcements && announcements.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">{announcements[0].title}</p>
              <p className="text-xs text-amber-800 mt-0.5">{announcements[0].message}</p>
            </div>
          </div>
        )}

        {/* ── Solde d'investissement ── */}
        <div className="gradient-green rounded-3xl p-6 relative overflow-hidden">
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] pointer-events-none" />

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/80 text-xs font-semibold tracking-widest uppercase">Solde d'investissement</p>
              <div className="flex gap-2">
                <button onClick={() => setHideBalance(b => !b)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  {hideBalance ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-white" />}
                </button>
                <button onClick={() => setLocation('/transactions')} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="text-4xl font-bold text-white mb-1" data-testid="text-investment-balance">
              {isLoading ? '...' : hideBalance ? '••••••' : formatCurrency(dashboard?.investmentBalance ?? 0)}
            </div>
            <p className="text-white/70 text-sm mb-4">Capital qui travaille pour vous</p>

            <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
              <span className="text-white/90 text-xs">Maximum autorisé :</span>
              <span className="text-white font-bold text-xs">{formatCurrency(maxCapital)}</span>
            </div>
          </div>
        </div>

        {/* ── Gains en direct ── */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <p className="text-white/80 text-xs font-semibold tracking-widest uppercase">Gains en direct</p>
              </div>
            </div>

            {snapshot ? (
              <LiveGains snapshot={snapshot} />
            ) : (
              <span className="text-3xl font-bold text-white">
                {formatCurrency(dashboard?.referralEarnings ?? 0, 5)}
              </span>
            )}
            <p className="text-white/70 text-sm mt-1 mb-4">Solde retirable à tout moment</p>

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

        {/* ── 4 boutons rapides ── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Déposer',    icon: ArrowDownCircle, color: 'bg-green-500',  href: '/deposit'      },
            { label: 'Retirer',    icon: ArrowUpCircle,   color: 'bg-blue-500',   href: '/withdraw'     },
            { label: 'Parrainage', icon: Users,           color: 'bg-orange-500', href: '/referrals'    },
            { label: 'Historique', icon: FileText,        color: 'bg-violet-500', href: '/transactions' },
          ].map(({ label, icon: Icon, color, href }) => (
            <button
              key={label}
              onClick={() => setLocation(href)}
              className="flex flex-col items-center gap-2 bg-card rounded-2xl p-3 border border-border shadow-sm hover:shadow-md transition-shadow"
              data-testid={`button-${label.toLowerCase()}`}
            >
              <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
                <Icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight text-center">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Bannière parrainage ── */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <p className="flex-1 text-sm font-medium text-foreground leading-snug">
            Invitez vos amis et gagnez jusqu'à <span className="text-primary font-bold">5%</span> de commission.
          </p>
          <button
            onClick={() => setLocation('/referrals')}
            className="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors shrink-0"
          >
            Voir plus
          </button>
        </div>

        {/* ── Transactions récentes ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">Transactions récentes</h2>
            <button onClick={() => setLocation('/transactions')} className="text-primary text-sm font-semibold">
              Voir tout
            </button>
          </div>

          {recentTx.length === 0 ? (
            <div className="bg-card rounded-2xl p-6 border border-border text-center text-muted-foreground text-sm">
              Aucune transaction pour l'instant
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-sm">
              {recentTx.map((tx: Transaction) => {
                const cfg = TX_CONFIG[tx.type as keyof typeof TX_CONFIG];
                const TxIcon = tx.type === 'deposit' ? DepositIcon : tx.type === 'withdrawal' ? ArrowUpCircle : tx.type === 'commission' ? Users : TrendingUp;
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <TxIcon className={`w-5 h-5 ${cfg.color}`} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm ${cfg.color}`}>
                        {cfg.sign}{formatCurrency(tx.amount)}
                      </p>
                      <p className={`text-xs font-medium ${STATUS_COLOR[tx.status]}`}>
                        {STATUS_LABEL[tx.status]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </UserLayout>
  );
}
