import { UserLayout } from '@/components/user-layout';
import { useAuth } from '@/lib/auth-context';
import { useGetDashboard, useGetAnnouncements } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/format';
import { GainsCounter } from '@/components/gains-counter';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, AlertCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
      <div className="bg-background border-b border-border pt-8 pb-6 px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src="/logo.jpg" alt="Fortexa" className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Bienvenue,</p>
              <h1 className="text-foreground text-xl font-bold" data-testid="text-username">{user.name}</h1>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <p className="text-muted-foreground text-sm font-medium mb-1">Capital investi</p>
          <div className="text-3xl font-bold text-primary" data-testid="text-investment-balance">
            {isLoading ? '...' : formatCurrency(dashboard?.investmentBalance || 0)}
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 pb-6 space-y-4">
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
