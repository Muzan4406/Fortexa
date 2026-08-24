import { ChevronLeft, Headphones, ExternalLink, Clock3, ShieldCheck, UsersRound } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useLocation } from 'wouter';
import { useGetDashboard } from '@workspace/api-client-react';

export default function SupportPage() {
  const [, setLocation] = useLocation();
  const { data: dashboard } = useGetDashboard();
  const links = dashboard?.settings;
  const communities = [
    { href: links?.whatsappChannelUrl, label: 'Chaîne WhatsApp', description: 'Recevez les nouveautés', icon: FaWhatsapp, color: '#25D366' },
    { href: links?.whatsappGroupUrl, label: 'Groupe de discussion WhatsApp', description: 'Discutez avec les membres', icon: FaWhatsapp, color: '#25D366' },
    { href: links?.whatsappSupportUrl, label: 'Service client WhatsApp', description: 'Contactez directement notre équipe', icon: FaWhatsapp, color: '#25D366' },
  ].filter((item) => item.href);

  return (
    <>
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-xl px-4 pt-8 pb-4 flex items-center gap-3 border-b border-white/10 sticky top-0 z-10">
        <button
          onClick={() => setLocation('/profile')}
           className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
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
         <div className="relative overflow-hidden rounded-3xl p-6 text-white text-center border border-emerald-300/20"
           style={{ background: 'linear-gradient(145deg, #062a2a, #071a35 70%, #0a1628)' }}>
           <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-emerald-400/15 blur-2xl" />
           <img src="/logo.jpg" alt="" className="relative w-16 h-16 rounded-2xl object-cover border border-emerald-200/30 shadow-[0_0_28px_rgba(52,211,153,.25)] mx-auto mb-4" />
           <div className="relative flex items-center justify-center gap-2 mb-1">
             <h2 className="text-xl font-bold">Support Fortexa</h2>
             <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
           </div>
           <p className="text-white/65 text-sm">Une équipe humaine pour vous accompagner à chaque étape.</p>
        </div>

         {communities.length > 0 ? (
           <div className="grid gap-3 sm:grid-cols-2">
             {communities.map(({ href, label, description, icon: Icon, color }) => (
               <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="w-full bg-card/80 rounded-2xl border border-border p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                 <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                   <Icon className="w-6 h-6" style={{ color }} />
                 </div>
                 <div className="flex-1">
                   <p className="font-semibold text-foreground">{label}</p>
                   <p className="text-sm text-muted-foreground">{description}</p>
                 </div>
                 <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
               </a>
             ))}
           </div>
         ) : (
           <div className="rounded-2xl border border-border bg-card p-5 text-center">
             <Headphones className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
             <p className="font-semibold text-foreground">Communautés bientôt disponibles</p>
             <p className="mt-1 text-sm text-muted-foreground">Les liens seront ajoutés par l’administrateur.</p>
           </div>
         )}

        {/* Info */}
         <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/10">
           <div className="flex justify-center gap-5 mb-3">
             <div className="flex items-center gap-1.5 text-xs text-emerald-300"><Clock3 className="w-3.5 h-3.5" /> 8h–22h</div>
             <div className="flex items-center gap-1.5 text-xs text-sky-300"><ShieldCheck className="w-3.5 h-3.5" /> 7j/7</div>
           </div>
           <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Notre équipe est disponible <span className="font-semibold text-foreground">7j/7 de 8h à 22h</span>.
            Temps de réponse moyen : <span className="font-semibold text-foreground">moins de 2h</span>.
          </p>
        </div>
      </div>
    </>
  );
}
