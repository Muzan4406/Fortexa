import { useState } from 'react';
import { UserLayout } from '@/components/user-layout';
import { useGetReferrals } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { Users, Copy, Share2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function ReferralsPage() {
  const { data: referralInfo, isLoading } = useGetReferrals();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copié!',
        description: 'Le code a été copié dans le presse-papier',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible de copier le code',
        variant: 'destructive',
      });
    }
  };

  const shareReferralLink = async () => {
    if (!referralInfo) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoignez Fortexa',
          text: `Utilisez mon code de parrainage: ${referralInfo.referralCode}`,
          url: referralInfo.referralLink,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      copyToClipboard(referralInfo.referralLink);
    }
  };

  return (
    <UserLayout>
      <div className="bg-background py-8 px-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Parrainage</h1>
            <p className="text-muted-foreground text-sm">Invitez et gagnez</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="bg-card rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mb-4" />
            <div className="h-12 bg-muted rounded w-full" />
          </div>
        ) : referralInfo ? (
          <>
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 shadow-xl text-white">
              <p className="text-white/90 text-sm font-medium mb-2">Votre code de parrainage</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                  <p className="text-2xl font-bold tracking-wider" data-testid="text-referral-code">
                    {referralInfo.referralCode}
                  </p>
                </div>
                <Button
                  onClick={() => copyToClipboard(referralInfo.referralCode)}
                  className="h-12 w-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                  data-testid="button-copy-code"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
              
              <Button
                onClick={shareReferralLink}
                className="w-full bg-white text-primary hover:bg-white/90 font-semibold"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager le lien
              </Button>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
              <h2 className="font-semibold text-foreground mb-4">Statistiques</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Commissions totales</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-total-commissions">
                    {formatCurrency(referralInfo.totalCommissions)}
                  </p>
                </div>
                
                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Total filleuls</p>
                  <p className="text-2xl font-bold text-foreground">
                    {referralInfo.level1Count + referralInfo.level2Count + referralInfo.level3Count}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Niveau 1</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">{referralInfo.level1Count}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Niveau 2</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">{referralInfo.level2Count}</span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Niveau 3</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">{referralInfo.level3Count}</span>
                </div>
              </div>
            </div>

            {referralInfo.commissions && referralInfo.commissions.length > 0 && (
              <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
                <h2 className="font-semibold text-foreground mb-4">Historique des commissions</h2>
                
                <div className="space-y-3">
                  {referralInfo.commissions.map(commission => (
                    <div
                      key={commission.id}
                      className="bg-muted/30 rounded-lg p-4 border border-border"
                      data-testid={`commission-${commission.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-foreground">{commission.refereeName}</p>
                          <p className="text-xs text-muted-foreground">Niveau {commission.level}</p>
                        </div>
                        <p className="text-lg font-bold text-primary">+{formatCurrency(commission.amount)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(commission.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </UserLayout>
  );
}
