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
import { PushNotifications } from '@/components/push-notifications';

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
    <div className="h-[100dvh] overflow-hidden overscroll-none bg-background">
      {/* ── Header : logo + nom ── */}
      <div className="bg-background border-b border-border px-5 pt-4 pb-4 relative">
        {/* hamburger */}
        <button
          onClick={openSidebar}
          className="absolute top-4 left-5 w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        <div className="flex flex-col items-center pt-1">
          <img
            src="/logo.jpg"
            alt="Fortexa"
            className="w-14 h-14 rounded-full object-cover border-3 border-border shadow-lg mb-2"
          />
          <h1 className="text-lg font-bold text-foreground">{user?.name ?? '...'}</h1>
          <p className="text-muted-foreground text-xs">{user?.email ?? ''}</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-3">
        <PushNotifications />
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
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocation('/deposit')}
            className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center shadow-sm">
              <img src="/investment-icon.png" alt="" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-sm font-semibold text-foreground">Déposer</span>
          </button>
          <button
            onClick={() => setLocation('/withdraw')}
            className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-sm">
              <img src="/withdrawal-icon.png" alt="" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-sm font-semibold text-foreground">Retirer</span>
          </button>
        </div>

        {/* ── Admin ── */}
        {user?.role === 'admin' && (
          <button
            onClick={() => setLocation('/admin')}
            className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between"
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

        <button
          onClick={() => setPasswordOpen(true)}
          className="w-full bg-card rounded-2xl p-4 border border-border flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><KeyRound className="w-5 h-5 text-primary" /></div>
            <div className="text-left"><p className="text-sm font-semibold text-foreground">Sécurité</p><p className="text-xs text-muted-foreground">Modifier votre mot de passe</p></div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* ── Service client ── */}
        <button
          onClick={() => setLocation('/support')}
          className="w-full bg-card rounded-2xl p-4 border border-border flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#229ED9]/10 flex items-center justify-center">
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
          className="w-full bg-card rounded-2xl p-4 border border-border flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
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
          className="w-full bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center justify-center gap-2 text-destructive font-medium"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
