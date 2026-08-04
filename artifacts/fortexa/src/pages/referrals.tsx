import { useState } from 'react';
import { UserLayout } from '@/components/user-layout';
import { useGetReferrals } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { Copy, Share2, CheckCircle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function LevelBadge({ level }: { level: number }) {
  const colors = ['bg-amber-400', 'bg-slate-400', 'bg-orange-400'];
  const labels = ['OR', 'ARGENT', 'BRONZE'];
  return (
    <span className={`inline-flex items-center justify-center w-16 h-6 rounded-full text-white text-[10px] font-bold ${colors[level - 1]}`}>
      {labels[level - 1]}
    </span>
  );
}

const LEVEL_CONFIG = [
  { level: 1, rate: '5%',  color: 'from-amber-400 to-yellow-500',  ring: 'ring-amber-300',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  { level: 2, rate: '3%',  color: 'from-slate-400 to-slate-500',   ring: 'ring-slate-300',  bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200'  },
  { level: 3, rate: '2%',  color: 'from-orange-300 to-orange-400', ring: 'ring-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
];

export default function ReferralsPage() {
  const { data: referralInfo, isLoading } = useGetReferrals();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: 'Copié !', description: 'Code copié dans le presse-papier' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier', variant: 'destructive' });
    }
  };

  const shareReferralLink = async () => {
    if (!referralInfo) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoignez Fortexa',
          text: `Utilisez mon code de parrainage : ${referralInfo.referralCode}`,
          url: referralInfo.referralLink,
        });
      } catch { /* cancelled */ }
    } else {
      copyToClipboard(referralInfo.referralLink);
    }
  };

  const totalMembers = referralInfo
    ? referralInfo.level1Count + referralInfo.level2Count + referralInfo.level3Count
    : 0;

  return (
    <UserLayout>
      {/* ── Header ── */}
      <div className="gradient-green px-5 pt-12 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="relative">
          <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1">Mon équipe</p>
          <h1 className="text-3xl font-bold text-white mb-1">Parrainage</h1>
          <p className="text-white/70 text-sm">Invitez et gagnez des commissions</p>

          {/* Total membres pill */}
          {!isLoading && referralInfo && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              <span className="text-white text-sm font-semibold">{totalMembers} membre{totalMembers !== 1 ? 's' : ''} dans votre réseau</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-2xl p-4 border border-border animate-pulse h-20" />
            ))}
          </div>
        ) : referralInfo ? (
          <>
            {/* ── Code de parrainage ── */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3">Votre code</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-xl px-4 py-3 border border-border">
                    <p className="text-xl font-bold tracking-[0.2em] text-foreground" data-testid="text-referral-code">
                      {referralInfo.referralCode}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(referralInfo.referralCode)}
                    className="w-12 h-12 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                    data-testid="button-copy-code"
                  >
                    {copied
                      ? <CheckCircle className="w-5 h-5 text-primary" />
                      : <Copy className="w-5 h-5 text-primary" />
                    }
                  </button>
                </div>
              </div>
              <button
                onClick={shareReferralLink}
                className="w-full bg-primary text-white font-semibold py-3.5 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4" />
                Partager mon lien d'invitation
              </button>
            </div>

            {/* ── Commissions totales ── */}
            <div className="gradient-green rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Commissions totales</p>
                <p className="text-2xl font-bold text-white" data-testid="text-total-commissions">
                  {formatCurrency(referralInfo.totalCommissions)}
                </p>
              </div>
            </div>

            {/* ── 3 niveaux ── */}
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3 px-1">Votre réseau</p>
              <div className="space-y-3">
                {LEVEL_CONFIG.map(({ level, rate, color, bg, text, border }) => {
                  const counts = [referralInfo.level1Count, referralInfo.level2Count, referralInfo.level3Count];
                  const count = counts[level - 1];
                  return (
                    <div key={level} className={`${bg} border ${border} rounded-2xl p-4 flex items-center gap-4`}>
                      {/* Level circle */}
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-sm`}>
                        <span className="text-white font-bold text-lg">{level}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`font-bold text-sm ${text}`}>Niveau {level}</p>
                          <LevelBadge level={level} />
                        </div>
                        <p className="text-xs text-muted-foreground">Commission : <span className="font-semibold">{rate}</span></p>
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${text}`}>{count}</p>
                        <p className="text-xs text-muted-foreground">membre{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Historique des commissions ── */}
            {referralInfo.commissions && referralInfo.commissions.length > 0 && (
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowHistory(h => !h)}
                  className="w-full flex items-center justify-between px-5 py-4"
                >
                  <p className="font-semibold text-foreground text-sm">Historique des commissions</p>
                  {showHistory
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  }
                </button>

                {showHistory && (
                  <div className="border-t border-border divide-y divide-border">
                    {referralInfo.commissions.map((commission, idx) => (
                      <div key={commission.id ?? idx} className="px-5 py-3.5 flex items-center justify-between" data-testid={`commission-${commission.id}`}>
                        <div>
                          <p className="text-sm font-medium text-foreground">{commission.refereeName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <LevelBadge level={commission.level} />
                            <p className="text-xs text-muted-foreground">{formatDate(commission.createdAt)}</p>
                          </div>
                        </div>
                        <p className="text-base font-bold text-primary">+{formatCurrency(commission.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </UserLayout>
  );
}
