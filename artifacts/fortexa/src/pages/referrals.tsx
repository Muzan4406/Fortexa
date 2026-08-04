import { useState } from 'react';
import { UserLayout } from '@/components/user-layout';
import { useGetReferrals } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { Copy, Share2, CheckCircle, Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSidebar } from '@/lib/sidebar-context';

/* ── Medal SVGs inline (bronze/silver/gold style) ── */
function MedalA() {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
      <circle cx="32" cy="32" r="28" fill="#CD7F32" opacity="0.15"/>
      <circle cx="32" cy="32" r="22" fill="#CD7F32"/>
      <circle cx="32" cy="32" r="18" fill="#E8A96A"/>
      <polygon points="32,16 35.5,26 46,26 37.5,32.5 40.5,43 32,37 23.5,43 26.5,32.5 18,26 28.5,26" fill="#FFD700" stroke="#CD7F32" strokeWidth="1"/>
      <circle cx="32" cy="32" r="3" fill="#fff" opacity="0.4"/>
    </svg>
  );
}
function MedalB() {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
      <circle cx="32" cy="32" r="28" fill="#4A90D9" opacity="0.15"/>
      <circle cx="32" cy="32" r="22" fill="#3B7DC4"/>
      <circle cx="32" cy="32" r="18" fill="#5A9FE8"/>
      {/* wings */}
      <path d="M10 32 Q16 22 24 28" stroke="#2A5FA8" strokeWidth="2" fill="none"/>
      <path d="M54 32 Q48 22 40 28" stroke="#2A5FA8" strokeWidth="2" fill="none"/>
      <polygon points="32,16 35.5,26 46,26 37.5,32.5 40.5,43 32,37 23.5,43 26.5,32.5 18,26 28.5,26" fill="#FFD700" stroke="#3B7DC4" strokeWidth="1"/>
      <circle cx="32" cy="32" r="3" fill="#fff" opacity="0.4"/>
    </svg>
  );
}
function MedalC() {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
      <circle cx="32" cy="32" r="28" fill="#B8340A" opacity="0.15"/>
      <circle cx="32" cy="32" r="22" fill="#B8340A"/>
      <circle cx="32" cy="32" r="18" fill="#E05A2B"/>
      <polygon points="32,16 35.5,26 46,26 37.5,32.5 40.5,43 32,37 23.5,43 26.5,32.5 18,26 28.5,26" fill="#FFD700" stroke="#B8340A" strokeWidth="1"/>
      <circle cx="32" cy="32" r="3" fill="#fff" opacity="0.4"/>
    </svg>
  );
}

/* ── User-group icon ── */
function TeamIcon() {
  return (
    <svg viewBox="0 0 80 60" className="w-16 h-12" fill="none">
      <circle cx="28" cy="20" r="12" fill="#22c55e" opacity="0.25"/>
      <circle cx="28" cy="20" r="9" fill="#16a34a" opacity="0.6"/>
      <circle cx="52" cy="20" r="12" fill="#22c55e" opacity="0.25"/>
      <circle cx="52" cy="20" r="9" fill="#16a34a" opacity="0.6"/>
      <path d="M8 52 Q28 34 28 34 Q28 34 52 34 Q52 34 72 52" stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="28" cy="20" r="5" fill="#bbf7d0"/>
      <circle cx="52" cy="20" r="5" fill="#bbf7d0"/>
    </svg>
  );
}

/* ── Person icon tile ── */
function PersonTile({ label, dot }: { label: string; dot?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 py-4 px-2">
      <div className="relative">
        <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
          <circle cx="20" cy="14" r="7" fill="#16a34a" opacity="0.7"/>
          <path d="M6 36 Q20 22 34 36" fill="#16a34a" opacity="0.7"/>
        </svg>
        {dot && (
          <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${dot}`} />
        )}
      </div>
      <span className="text-xs font-medium text-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

export default function ReferralsPage() {
  const { data: referralInfo, isLoading } = useGetReferrals();
  const { toast } = useToast();
  const { open: openSidebar } = useSidebar();
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

  const total = referralInfo
    ? referralInfo.level1Count + referralInfo.level2Count + referralInfo.level3Count
    : 0;

  return (
    <UserLayout>
      {/* ── Header vert centré ── */}
      <div className="gradient-green px-5 pt-10 pb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />

        <button
          onClick={openSidebar}
          className="absolute top-10 left-5 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        <h1 className="text-xl font-bold text-white text-center relative">Équipe</h1>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* ── Card stats membres ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Total */}
          <div className="flex flex-col items-center pt-6 pb-4 border-b border-border">
            <TeamIcon />
            <p className="text-4xl font-bold text-primary mt-2">
              {isLoading ? '…' : total}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Nombre total de membres de l'équipe</p>
          </div>

          {/* 3 niveaux */}
          <div className="grid grid-cols-3 divide-x divide-border py-4 px-2">
            {[
              { Medal: MedalA, label: 'Niveau A', count: referralInfo?.level1Count ?? 0 },
              { Medal: MedalB, label: 'Niveau B', count: referralInfo?.level2Count ?? 0 },
              { Medal: MedalC, label: 'Niveau C', count: referralInfo?.level3Count ?? 0 },
            ].map(({ Medal, label, count }) => (
              <div key={label} className="flex flex-col items-center gap-1 px-1">
                <Medal />
                <p className="text-2xl font-bold text-primary">{isLoading ? '…' : count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3 tiles actions ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-border">
            <button
              onClick={shareReferralLink}
              className="hover:bg-muted/50 transition-colors"
            >
              <PersonTile label="Recrutement" />
            </button>
            <div>
              <PersonTile label={`employé\ntemporaire`} dot="bg-amber-400" />
            </div>
            <div>
              <PersonTile label={`employé\npermanent`} dot="bg-green-500" />
            </div>
          </div>
        </div>

        {/* ── Code de parrainage ── */}
        {referralInfo && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-3">Votre code de parrainage</p>
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
                  {copied ? <CheckCircle className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5 text-primary" />}
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
        )}

        {/* ── Section événement ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center text-center">
          {/* Decorative circle with ? */}
          <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center mb-4 relative">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary/60">?</span>
            </div>
            {/* floating dots */}
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-primary/30" />
            <span className="absolute bottom-2 left-1 w-1.5 h-1.5 rounded-full bg-primary/20" />
          </div>
          <p className="font-bold text-foreground text-base mb-1">L'événement n'a pas encore commencé</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pour plus d'événements exceptionnels, veuillez suivre les notifications.
          </p>
        </div>

        {/* ── Commissions totales ── */}
        {referralInfo && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Commissions totales</p>
              <p className="text-2xl font-bold text-primary mt-0.5" data-testid="text-total-commissions">
                {formatCurrency(referralInfo.totalCommissions)}
              </p>
            </div>
          </div>
        )}

        {/* ── Historique commissions (collapsable) ── */}
        {referralInfo?.commissions && referralInfo.commissions.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <button
              onClick={() => setShowHistory(h => !h)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <p className="font-semibold text-foreground text-sm">Historique des commissions</p>
              {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showHistory && (
              <div className="border-t border-border divide-y divide-border">
                {referralInfo.commissions.map((c, idx) => (
                  <div key={c.id ?? idx} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.refereeName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Niveau {c.level} · {formatDate(c.createdAt)}</p>
                    </div>
                    <p className="text-base font-bold text-primary">+{formatCurrency(c.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </UserLayout>
  );
}
