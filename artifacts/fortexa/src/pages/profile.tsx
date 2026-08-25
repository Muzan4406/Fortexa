import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';
import {
  ChevronRight, Shield, Headphones, Info, LogOut, Menu, KeyRound, X,
} from 'lucide-react';
import { useState } from 'react';
import { useUpdatePassword } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSidebar } from '@/lib/sidebar-context';

export default function ProfilePage() {
  const { clearAuth, user } = useAuth();
  const [, setLocation] = useLocation();
  const { open: openSidebar } = useSidebar();
  const { toast } = useToast();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const passwordMutation = useUpdatePassword();

  const handleLogout = () => {
    clearAuth();
    setLocation('/login');
  };

  const changePassword = () => {
    passwordMutation.mutate({ data: { currentPassword, newPassword } }, {
      onSuccess: () => {
        toast({ title: 'Mot de passe modifié', description: 'Votre nouveau mot de passe est actif.' });
        setPasswordOpen(false); setCurrentPassword(''); setNewPassword('');
      },
      onError: (error: any) => toast({ title: 'Erreur', description: error.data?.error || 'Impossible de modifier le mot de passe', variant: 'destructive' }),
    });
  };

  return (
    <div
      className="fixed inset-0 z-0 h-[100dvh] overflow-y-scroll overscroll-y-auto bg-background pb-24"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* ── Header : logo + nom ── */}
      <div className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-br from-[#eff6ff] via-[#f8fbff] to-[#eef2ff] px-5 py-3">
        <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-blue-300/20 blur-3xl" />
        {/* hamburger */}
        <button
          onClick={openSidebar}
          className="absolute left-5 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/75 shadow-sm backdrop-blur"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-4 w-4 text-foreground" />
        </button>

        <div className="relative flex items-center justify-center gap-3 pl-10">
          <img
            src="/logo.jpg"
            alt="Fortexa"
            className="h-12 w-12 rounded-2xl border-3 border-white object-cover shadow-md shadow-blue-900/10"
          />
          <div className="min-w-0 text-left">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900">{user?.name ?? '...'}</h1>
            <p className="truncate text-xs text-slate-500">{user?.email ?? ''}</p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Compte actif
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-4 py-5">
        {passwordOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-card border border-white/10 rounded-3xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-foreground">Modifier le mot de passe</h2>
                <button onClick={() => setPasswordOpen(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <Input type="password" placeholder="Mot de passe actuel" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                <Input type="password" placeholder="Nouveau mot de passe (6 caractères minimum)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <Button className="w-full" onClick={changePassword} disabled={passwordMutation.isPending || !currentPassword || newPassword.length < 6}>
                  {passwordMutation.isPending ? 'Modification…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Dépôt / Retrait ── */}
        <div>
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Actions rapides</p>
          <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation('/deposit')}
            className="group rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <img src="/investment-icon.png" alt="" className="h-8 w-8 object-contain" />
            </div>
            <span className="block text-sm font-bold text-slate-900">Déposer</span>
            <span className="mt-1 block text-[11px] text-slate-500">Ajouter du capital</span>
          </button>
          <button
            onClick={() => setLocation('/withdraw')}
            className="group rounded-2xl border border-rose-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/20">
              <img src="/withdrawal-icon.png" alt="" className="h-8 w-8 object-contain" />
            </div>
            <span className="block text-sm font-bold text-slate-900">Retirer</span>
            <span className="mt-1 block text-[11px] text-slate-500">Recevoir vos gains</span>
          </button>
          </div>
        </div>

        {/* ── Admin ── */}
        {user?.role === 'admin' && (
          <button
            onClick={() => setLocation('/admin')}
            className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-amber-900">Administration</p>
                <p className="text-xs text-amber-700">Accès panneau admin</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600" />
          </button>
        )}

        <p className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Gérer votre compte</p>

        <button
          onClick={() => setPasswordOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"><KeyRound className="w-5 h-5 text-blue-600" /></div>
            <div className="text-left"><p className="text-sm font-semibold text-foreground">Sécurité</p><p className="text-xs text-muted-foreground">Modifier votre mot de passe</p></div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* ── Service client ── */}
        <button
          onClick={() => setLocation('/support')}
          className="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <Headphones className="w-5 h-5 text-[#229ED9]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Service client</p>
              <p className="text-xs text-muted-foreground">Chaîne, groupe et service client WhatsApp</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* ── À propos ── */}
        <button
          onClick={() => setLocation('/about')}
          className="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">À propos de nous</p>
              <p className="text-xs text-muted-foreground">Notre mission et nos valeurs</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* ── Déconnexion ── */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-600 transition-colors hover:bg-rose-100"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
