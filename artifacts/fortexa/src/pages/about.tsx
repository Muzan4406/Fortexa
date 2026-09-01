import { ChevronLeft, TrendingUp, Shield, Users, Star } from 'lucide-react';
import { useLocation } from 'wouter';
import { useGetDashboard } from '@workspace/api-client-react';

const VALUES = [
  {
    icon: TrendingUp,
    color: 'bg-green-500',
    title: 'Performance',
    desc: 'Nous optimisons chaque investissement pour vous offrir les meilleurs rendements du marché.',
  },
  {
    icon: Shield,
    color: 'bg-blue-500',
    title: 'Sécurité',
    desc: 'Vos fonds sont protégés grâce à des protocoles de sécurité de niveau bancaire.',
  },
  {
    icon: Users,
    color: 'bg-orange-500',
    title: 'Communauté',
    desc: 'Rejoignez des milliers d\'investisseurs qui font confiance à Fortexa chaque jour.',
  },
  {
    icon: Star,
    color: 'bg-violet-500',
    title: 'Transparence',
    desc: 'Suivez vos gains en temps réel. Aucune surprise, aucun frais caché.',
  },
];

export default function AboutPage() {
  const [, setLocation] = useLocation();
  const { data: dashboard } = useGetDashboard();
  const dailyRate = dashboard?.settings?.dailyRatePercent;

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
          <h1 className="text-lg font-bold text-foreground">À propos de nous</h1>
          <p className="text-xs text-muted-foreground">Notre mission et nos valeurs</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5">
        {/* Hero */}
        <div className="gradient-green rounded-2xl p-6 text-white text-center">
          <img src="/logo.jpg" alt="Fortexa" className="w-16 h-16 rounded-full object-cover border-2 border-white/30 mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-1">Fortexa</h2>
          <p className="text-white/80 text-sm font-medium">Votre capital, nos résultats</p>
        </div>

        {/* Mission */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="font-bold text-foreground mb-2">Notre mission</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Fortexa est une plateforme d'investissement conçue pour rendre la croissance financière accessible à tous.
            Nous offrons des rendements quotidiens transparents et un système de parrainage innovant qui récompense
            votre réseau.
          </p>
        </div>

        {/* Values */}
        <div>
          <h3 className="font-bold text-foreground mb-3 px-1">Nos valeurs</h3>
          <div className="grid grid-cols-2 gap-3">
            {VALUES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <h3 className="font-bold text-foreground mb-4 text-center">Fortexa en chiffres</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{dailyRate !== undefined ? `${dailyRate}%` : '—'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Rendement/jour</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">3</p>
              <p className="text-xs text-muted-foreground mt-0.5">Niveaux de parrainage</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">24/7</p>
              <p className="text-xs text-muted-foreground mt-0.5">Gains actifs</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
