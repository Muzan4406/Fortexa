import { ChevronLeft, Send, Headphones, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';

const TELEGRAM_CANAL = 'https://t.me/fortexa_officiel';
const TELEGRAM_SUPPORT = 'https://t.me/fortexa_support';

export default function SupportPage() {
  const [, setLocation] = useLocation();

  return (
    <>
      {/* Header */}
      <div className="bg-background px-4 pt-8 pb-4 flex items-center gap-3 border-b border-border sticky top-0 z-10">
        <button
          onClick={() => setLocation('/profile')}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Service client</h1>
          <p className="text-xs text-muted-foreground">Nous sommes là pour vous aider</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Hero */}
        <div className="gradient-green rounded-2xl p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Headphones className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">Support Fortexa</h2>
          <p className="text-white/80 text-sm">Une question ? Notre équipe vous répond rapidement via Telegram.</p>
        </div>

        {/* Canal officiel */}
        <a
          href={TELEGRAM_CANAL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow block"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#229ED9]/10 flex items-center justify-center shrink-0">
            <Send className="w-6 h-6 text-[#229ED9]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Canal officiel</p>
            <p className="text-sm text-muted-foreground">Annonces, actualités et mises à jour</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
        </a>

        {/* Service client */}
        <a
          href={TELEGRAM_SUPPORT}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow block"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Service client Telegram</p>
            <p className="text-sm text-muted-foreground">Contactez un agent en direct</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
        </a>

        {/* Info */}
        <div className="bg-muted/50 rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Notre équipe est disponible <span className="font-semibold text-foreground">7j/7 de 8h à 22h</span>.
            Temps de réponse moyen : <span className="font-semibold text-foreground">moins de 2h</span>.
          </p>
        </div>
      </div>
    </>
  );
}
