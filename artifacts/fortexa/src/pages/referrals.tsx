import { useState } from 'react';
import { useGetReferrals } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { Copy, Share2, CheckCircle, Menu, ChevronDown, ChevronUp, Network, Sparkles, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSidebar } from '@/lib/sidebar-context';

/* ── Stars background ── */
function Stars({ count = 30 }: { count?: number }) {
  const pts = Array.from({ length: count }, (_, i) => ({
    cx: (i * 97 + 13) % 320,
    cy: (i * 53 + 7) % 120,
    r: i % 5 === 0 ? 1.2 : 0.65,
    op: i % 3 === 0 ? 0.55 : 0.25,
  }));
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice">
      {pts.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="white" opacity={p.op} />)}
    </svg>
  );
}

/* ── Level medal badges ── */
function LevelBadge({ level, count, percent, isLoading }: { level: 'A' | 'B' | 'C'; count: number; percent: string; isLoading: boolean }) {
  const styles = {
    A: { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  text: '#fcd34d', glow: 'rgba(251,191,36,0.2)',  label: 'Niveau A', sub: '5% / filleul' },
    B: { bg: 'rgba(147,197,253,0.1)', border: 'rgba(147,197,253,0.3)', text: '#93c5fd', glow: 'rgba(147,197,253,0.15)', label: 'Niveau B', sub: '3% / filleul' },
    C: { bg: 'rgba(252,165,165,0.1)', border: 'rgba(252,165,165,0.3)', text: '#fca5a5', glow: 'rgba(252,165,165,0.15)', label: 'Niveau C', sub: '2% / filleul' },
  }[level];
  const emoji = { A: '🥇', B: '🥈', C: '🥉' }[level];
  return (
    <div
      className="flex flex-col items-center py-5 px-3 rounded-xl"
      style={{ background: styles.bg, border: `1px solid ${styles.border}`, boxShadow: `0 0 20px ${styles.glow}` }}
    >
      <span className="text-2xl mb-1">{emoji}</span>
      <p className="text-2xl font-bold" style={{ color: styles.text }}>
        {isLoading ? '…' : count}
      </p>
      <p className="text-xs font-semibold mt-0.5" style={{ color: styles.text }}>{styles.label}</p>
      <p className="text-xs mt-0.5" style={{ color: `${styles.text}80` }}>{styles.sub}</p>
      <p className="text-xs font-medium mt-1.5 px-2 py-0.5 rounded-full" style={{ background: `${styles.border}40`, color: styles.text }}>
        {percent}%
      </p>
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

  const l1 = referralInfo?.level1Count ?? 0;
  const l2 = referralInfo?.level2Count ?? 0;
  const l3 = referralInfo?.level3Count ?? 0;
  const total = l1 + l2 + l3;

  return (
    <>
      {/* ── Nocturnal Header ── */}
      <div
        className="relative overflow-hidden px-5 pt-10 pb-8"
        style={{ background: 'linear-gradient(160deg, #0a1628 0%, #071a14 60%, #060d1f 100%)' }}
      >
        <Stars count={35} />
        {/* Glow orbs */}
        <div className="absolute -top-10 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-16 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(52,211,153,0.08) 0%, transparent 70%)' }} />
        {/* Bottom separator */}
        <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.3), transparent)' }} />

        <div className="relative">
          <button
            onClick={openSidebar}
            className="absolute top-0 left-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Menu className="w-5 h-5 text-white/70" />
          </button>

          <div className="text-center pt-0.5">
             <p className="text-white/50 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Ma communauté</p>

            {/* Team icon */}
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', boxShadow: '0 0 24px rgba(52,211,153,0.15)' }}>
               <img src="/team-icon.png" alt="" className="w-10 h-10 object-contain" />
            </div>

            {/* Total members */}
            <p
              className="text-5xl font-bold"
              style={{ color: '#34d399', textShadow: '0 0 30px rgba(52,211,153,0.5)' }}
            >
              {isLoading ? '…' : total}
            </p>
             <p className="text-white/40 text-sm mt-1">personne{total !== 1 ? 's' : ''} connectée{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* ── Niveau grid ── */}
        <div className="grid grid-cols-3 gap-2">
          <LevelBadge level="A" count={l1} percent="5" isLoading={isLoading} />
          <LevelBadge level="B" count={l2} percent="3" isLoading={isLoading} />
          <LevelBadge level="C" count={l3} percent="2" isLoading={isLoading} />
        </div>

        {/* ── Commissions totales ── */}
        {referralInfo && (
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0.02) 100%)',
              border: '1px solid rgba(52,211,153,0.2)',
            }}
          >
            <div>
               <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(52,211,153,0.6)' }}>
                 Récompenses générées
              </p>
              <p className="text-2xl font-bold mt-0.5 text-emerald-400" data-testid="text-total-commissions">
                {formatCurrency(referralInfo.totalCommissions)}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
               <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        )}

        {/* ── Code de parrainage ── */}
        {referralInfo && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                 Invitez votre communauté
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}
                >
                  <p
                    className="text-xl font-bold tracking-[0.25em]"
                    style={{ color: '#34d399' }}
                    data-testid="text-referral-code"
                  >
                    {referralInfo.referralCode}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(referralInfo.referralCode)}
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
                  data-testid="button-copy-code"
                >
                  {copied
                    ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                    : <Copy className="w-5 h-5 text-emerald-400" />}
                </button>
              </div>
            </div>
            <button
              onClick={shareReferralLink}
              className="w-full py-3.5 flex items-center justify-center gap-2 font-semibold text-sm transition-all"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#fff',
              }}
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4" />
               Partager mon invitation
            </button>
          </div>
        )}

        {/* ── Historique commissions (collapsable) ── */}
        {referralInfo?.commissions && referralInfo.commissions.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={() => setShowHistory(h => !h)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
               <p className="font-semibold text-sm text-white">Dernières récompenses</p>
              {showHistory
                ? <ChevronUp className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />}
            </button>
            {showHistory && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {referralInfo.commissions.map((c, idx) => (
                  <div
                    key={c.id ?? idx}
                    className="px-5 py-3.5 flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{c.refereeName}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Niveau {c.level} · {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <p className="text-base font-bold text-emerald-400">+{formatCurrency(c.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
