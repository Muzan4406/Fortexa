import { useState } from 'react';
import { useGetReferrals } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { ArrowRight, CheckCircle, ChevronDown, ChevronUp, Copy, Gift, Link2, Menu, Share2, TrendingUp, UsersRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSidebar } from '@/lib/sidebar-context';

const LEVELS = [
  { key: 'LV1', count: 'level1Count' as const, percent: 5, tone: 'from-rose-500 to-pink-500' },
  { key: 'LV2', count: 'level2Count' as const, percent: 3, tone: 'from-pink-500 to-fuchsia-500' },
  { key: 'LV3', count: 'level3Count' as const, percent: 2, tone: 'from-fuchsia-500 to-purple-500' },
];

function ProgressRing({ percent }: { percent: number }) {
  return (
    <div
      className="h-11 w-11 rounded-full p-[4px]"
      style={{ background: `conic-gradient(#e11d48 ${percent * 10}%, #fce7f3 0)` }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
        <div className="h-2 w-2 rounded-full bg-rose-500" />
      </div>
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
      toast({ title: 'Copié', description: 'Le code est dans le presse-papier.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier le code.', variant: 'destructive' });
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
      } catch { /* partage annulé */ }
    } else {
      await copyToClipboard(referralInfo.referralLink);
    }
  };

  const total = (referralInfo?.level1Count ?? 0) + (referralInfo?.level2Count ?? 0) + (referralInfo?.level3Count ?? 0);

  return (
    <div className="min-h-screen bg-[#fffafb] pb-5 text-slate-900">
      <header className="flex items-center justify-between border-b border-rose-100 bg-white px-4 pb-3 pt-8">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Fortexa" className="h-8 w-8 rounded-full object-cover" />
          <div>
            <p className="text-sm font-extrabold tracking-tight">FORTEXA</p>
            <p className="text-[8px] uppercase tracking-[0.18em] text-slate-400">Investir. Grandir. Réussir.</p>
          </div>
        </div>
        <button onClick={openSidebar} className="flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
          Mon espace <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <main className="space-y-3 px-3 pt-3">
        <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-white via-rose-50 to-pink-100 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <img src="/team-icon.png" alt="" className="h-14 w-14 rounded-2xl bg-white p-1.5 object-contain shadow-sm" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-rose-500">Votre communauté</p>
              <h1 className="mt-1 text-2xl font-black leading-tight text-slate-900">Votre équipe</h1>
              <p className="mt-1 text-[11px] text-slate-500">Invitez et gagnez des commissions.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 divide-x divide-rose-100 rounded-xl bg-white/90 px-1 py-2.5">
            <div className="text-center"><UsersRound className="mx-auto h-4 w-4 text-rose-500" /><p className="mt-1 text-sm font-extrabold">{isLoading ? '—' : total}</p><p className="text-[9px] text-slate-400">Membres</p></div>
            <div className="text-center"><Gift className="mx-auto h-4 w-4 text-rose-500" /><p className="mt-1 text-sm font-extrabold text-rose-600">{formatCurrency(referralInfo?.totalCommissions ?? 0)}</p><p className="text-[9px] text-slate-400">Récompenses</p></div>
          </div>
        </section>

        {referralInfo && (
          <section className="overflow-hidden rounded-[20px] border border-rose-100 bg-white shadow-sm">
            <div className="p-4">
              <h2 className="text-base font-extrabold leading-tight">Commencez à inviter vos amis</h2>
              <p className="mt-1 text-[10px] text-slate-400">Partagez votre code ou votre lien d’invitation</p>
              <button onClick={() => copyToClipboard(referralInfo.referralCode)} className="mt-3 flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-left text-[10px] text-slate-600">
                <span className="flex items-center gap-1.5"><Copy className="h-3 w-3 text-slate-400" />{referralInfo.referralCode}</span>
                {copied ? <CheckCircle className="h-3.5 w-3.5 text-rose-500" /> : <Copy className="h-3.5 w-3.5 text-rose-400" />}
              </button>
              <button onClick={() => copyToClipboard(referralInfo.referralLink)} className="mt-2 flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-left text-[9px] text-slate-500">
                <span className="flex min-w-0 items-center gap-1.5"><Link2 className="h-3 w-3 shrink-0 text-slate-400" /><span className="truncate">{referralInfo.referralLink}</span></span><Copy className="h-3.5 w-3.5 shrink-0 text-rose-400" />
              </button>
              <button onClick={shareReferralLink} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm shadow-rose-200">
                <Share2 className="h-3.5 w-3.5" /> Partager maintenant
              </button>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-[20px] border border-rose-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-rose-50 px-4 py-3">
            <TrendingUp className="h-4 w-4 text-rose-500" />
            <h2 className="text-xs font-extrabold uppercase tracking-wide">Vos gains par niveau</h2>
          </div>
          {LEVELS.map((level) => {
            const count = referralInfo?.[level.count] ?? 0;
            return (
              <div key={level.key} className="grid grid-cols-[72px_52px_1fr_52px] items-center gap-2 border-b border-slate-50 px-3 py-2 last:border-0">
                <div className={`rounded-xl bg-gradient-to-r ${level.tone} py-2.5 text-center text-sm font-black text-white shadow-sm`}>{level.key}</div>
                <ProgressRing percent={level.percent} />
                <div><p className="text-sm font-extrabold text-rose-600">{level.percent}%</p><p className="text-[9px] text-slate-400">Commission</p></div>
                <div className="text-center"><p className="text-xs font-bold">{count}</p><p className="text-[9px] text-slate-400">Membres</p></div>
              </div>
            );
          })}
        </section>

        {referralInfo?.commissions && referralInfo.commissions.length > 0 && (
          <section className="overflow-hidden rounded-[20px] border border-rose-100 bg-white shadow-sm">
            <button onClick={() => setShowHistory((value) => !value)} className="flex w-full items-center justify-between px-4 py-4">
              <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide"><Gift className="h-4 w-4 text-rose-500" />Dernières récompenses</span>
              {showHistory ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            {showHistory && referralInfo.commissions.map((commission, index) => (
              <div key={commission.id ?? index} className="flex items-center justify-between border-t border-slate-50 px-4 py-3">
                <div><p className="text-xs font-bold">{commission.refereeName}</p><p className="text-[10px] text-slate-400">Niveau {commission.level} · {formatDate(commission.createdAt)}</p></div>
                <p className="text-sm font-extrabold text-rose-600">+{formatCurrency(commission.amount)}</p>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}