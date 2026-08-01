import { useLocation } from 'wouter';
import { useGetAdminStats } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/format';
import { AdminLayout } from '@/components/admin-layout';
import {
  Users, ArrowDownCircle, ArrowUpCircle, TrendingUp,
  Clock, DollarSign, BarChart3,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();
  const [, setLocation] = useLocation();

  const statCards = [
    { label: 'Utilisateurs', value: stats?.totalUsers ?? 0, sub: `${stats?.activeUsers ?? 0} actifs`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Capital investi', value: formatCurrency(stats?.totalInvestmentCapital ?? 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Dépôts approuvés', value: formatCurrency(stats?.totalDeposits ?? 0), icon: ArrowDownCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Retraits approuvés', value: formatCurrency(stats?.totalWithdrawals ?? 0), icon: ArrowUpCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Gains distribués', value: formatCurrency(stats?.totalGainsDistributed ?? 0), icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Frais collectés', value: formatCurrency(stats?.totalFeeRevenue ?? 0), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const quickLinks = [
    { label: 'Dépôts en attente', count: stats?.pendingDepositsCount ?? 0, href: '/admin/deposits', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { label: 'Retraits en attente', count: stats?.pendingWithdrawalsCount ?? 0, href: '/admin/withdrawals', color: 'border-orange-200 bg-orange-50 text-orange-700' },
  ];

  return (
    <AdminLayout title="Tableau de bord">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p className="font-bold text-foreground text-sm leading-tight">
                {isLoading ? '...' : typeof card.value === 'number' ? card.value : card.value}
              </p>
              {card.sub && <p className="text-xs text-muted-foreground mt-0.5">{isLoading ? '' : card.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Actions requises</h2>
      <div className="space-y-3 mb-6">
        {quickLinks.map((link) => (
          <button
            key={link.href}
            onClick={() => setLocation(link.href)}
            className={`w-full rounded-xl p-4 border flex items-center justify-between ${link.color}`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <span className="font-medium">{link.label}</span>
            </div>
            <span className="text-2xl font-bold">{isLoading ? '...' : link.count}</span>
          </button>
        ))}
      </div>

      {/* Nav cards */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Gestion</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Utilisateurs', href: '/admin/users', icon: Users },
          { label: 'Dépôts', href: '/admin/deposits', icon: ArrowDownCircle },
          { label: 'Retraits', href: '/admin/withdrawals', icon: ArrowUpCircle },
          { label: 'Paramètres', href: '/admin/settings', icon: BarChart3 },
        ].map(({ label, href, icon: Icon }) => (
          <button
            key={href}
            onClick={() => setLocation(href)}
            className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col items-center gap-2 hover:border-primary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{label}</span>
          </button>
        ))}
      </div>
    </AdminLayout>
  );
}
