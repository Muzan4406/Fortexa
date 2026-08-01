import { useState } from 'react';
import { UserLayout } from '@/components/user-layout';
import { useGetProfile, useUpdateProfile, useUpdatePassword } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';
import { User, Lock, Copy, LogOut, ChevronRight, Shield } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetProfileQueryKey, getGetMeQueryKey } from '@workspace/api-client-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Mot de passe actuel requis'),
  newPassword: z.string().min(6, 'Nouveau mot de passe (min 6 caractères)'),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const { clearAuth, user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  const { data: profile, isLoading } = useGetProfile();
  const updateProfileMutation = useUpdateProfile();
  const updatePasswordMutation = useUpdatePassword();

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      name: profile?.name ?? '',
      phone: profile?.phone ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(
      { data: { name: data.name, phone: data.phone || undefined } },
      {
        onSuccess: () => {
          toast({ title: 'Profil mis à jour' });
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' });
        },
      }
    );
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    updatePasswordMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: 'Mot de passe modifié' });
          passwordForm.reset();
        },
        onError: (err: any) => {
          toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' });
        },
      }
    );
  };

  const handleLogout = () => {
    clearAuth();
    setLocation('/login');
  };

  const copyReferralCode = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      toast({ title: 'Code copié !', description: profile.referralCode });
    }
  };

  return (
    <UserLayout>
      <div className="gradient-green py-8 px-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user?.name ?? '...'}</h1>
            <p className="text-white/80 text-sm">{user?.email ?? ''}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* Referral code */}
        {profile?.referralCode && (
          <button
            onClick={copyReferralCode}
            className="w-full bg-card rounded-xl p-4 border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users2 className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Code parrainage</p>
                <p className="font-bold text-foreground tracking-widest">{profile.referralCode}</p>
              </div>
            </div>
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {/* Admin link */}
        {user?.role === 'admin' && (
          <button
            onClick={() => setLocation('/admin')}
            className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
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

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'info' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Informations
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'password' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Sécurité
          </button>
        </div>

        {activeTab === 'info' && (
          <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Mes informations</h2>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone (optionnel)</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+225 XX XX XX XX" {...field} className="h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-12"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </form>
              </Form>
            )}
          </div>
        )}

        {activeTab === 'password' && (
          <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Changer le mot de passe</h2>
            </div>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe actuel</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={updatePasswordMutation.isPending}
                >
                  {updatePasswordMutation.isPending ? 'Modification...' : 'Modifier le mot de passe'}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-center gap-2 text-destructive font-medium"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>
      </div>
    </UserLayout>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function Users2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
