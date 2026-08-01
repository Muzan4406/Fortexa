import { UserLayout } from '@/components/user-layout';
import { useAuth } from '@/lib/auth-context';
import { useGetDashboard, useGetAnnouncements } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/format';
import { GainsCounter } from '@/components/gains-counter';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: announcements } = useGetAnnouncements();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <UserLayout>
      <div className="gradient-green pt-8 pb-24 px-6 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-white/30">
                <AvatarFallback className="bg-white/20 text-white font-bold text-lg backdrop-blur-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white/80 text-sm font-medium">Bienvenue,</p>
                <h1 className="text-white text-xl font-bold" data-testid="text-username">{user.name}</h1>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-white/90 text-sm font-medium">Capital investi</p>
            <div className="text-4xl font-bold text-white" data-testid="text-investment-balance">
              {isLoading ? '...' : formatCurrency(dashboard?.investmentBalance || 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-16 pb-6 space-y-4">
        <GainsCounter />

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setLocation('/deposit')}
            className="h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base shadow-lg"
            data-testid="button-deposit"
          >
            <ArrowDownCircle className="w-5 h-5 mr-2" />
            Déposer
          </Button>
          
          <Button
            onClick={() => setLocation('/withdraw')}
            className="h-14 bg-[#0D5C3D] hover:bg-[#0D5C3D]/90 text-white font-semibold text-base shadow-lg"
            data-testid="button-withdraw"
          >
            <ArrowUpCircle className="w-5 h-5 mr-2" />
            Retirer
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">Total déposé</p>
            </div>
            <p className="text-lg font-bold text-foreground" data-testid="text-total-deposited">
              {isLoading ? '...' : formatCurrency(dashboard?.totalDeposited || 0)}
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">Commissions</p>
            </div>
            <p className="text-lg font-bold text-foreground" data-testid="text-referral-earnings">
              {isLoading ? '...' : formatCurrency(dashboard?.referralEarnings || 0)}
            </p>
          </div>
        </div>

        {announcements && announcements.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">{announcements[0].title}</h3>
                <p className="text-sm text-amber-800">{announcements[0].message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-3">Informations</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taux journalier</span>
              <span className="font-semibold text-primary">{dashboard?.settings.dailyRatePercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dépôt minimum</span>
              <span className="font-semibold">{formatCurrency(dashboard?.settings.minDeposit || 3000)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais de retrait</span>
              <span className="font-semibold">{dashboard?.settings.withdrawalFeePercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
