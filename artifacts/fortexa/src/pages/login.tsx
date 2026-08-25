import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { TurnstileWidget } from '@/components/turnstile-widget';
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe requis (min 6 caractères)'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setAuth, user } = useAuth();
  const { toast } = useToast();
  const [adminChallenge, setAdminChallenge] = useState<{ challengeId: string; expiresAt: number } | null>(null);
  const [adminCode, setAdminCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, captchaToken }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Email ou mot de passe incorrect');
      if (payload.requiresAdminCode) {
        setAdminChallenge({ challengeId: payload.challengeId, expiresAt: Date.now() + (payload.expiresInSeconds ?? 180) * 1000 });
        toast({ title: 'Code envoyé', description: 'Consultez le groupe Telegram administrateur.' });
        return;
      }
      setAuth(payload.user, payload.token);
      toast({ title: 'Connexion réussie', description: `Bienvenue ${payload.user.name}` });
      window.setTimeout(() => setLocation('/dashboard'), 350);
    } catch (error: any) {
      toast({ title: 'Erreur de connexion', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyAdminCode = async () => {
    if (!adminChallenge || !/^\d{6}$/.test(adminCode)) return;
    setIsSubmitting(true);
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/auth/verify-admin-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: adminChallenge.challengeId, code: adminCode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Code incorrect');
      setAuth(payload.user, payload.token);
      toast({ title: 'Connexion administrateur réussie' });
      window.setTimeout(() => setLocation('/admin'), 350);
    } catch (error: any) {
      toast({ title: 'Vérification refusée', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="bg-background py-10 px-6 text-center flex flex-col items-center">
        <img
          src="/logo.jpg"
          alt="Fortexa"
          className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 shadow-lg mb-4"
        />
        <h1 className="text-3xl font-bold text-foreground mb-1">Fortexa</h1>
        <p className="text-muted-foreground text-sm">Votre capital, nos résultats</p>
      </div>

      <div className="flex-1 px-6 pb-8">
        <div className="bg-card rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Connexion</h2>
            <p className="text-sm text-muted-foreground">Accédez à votre compte</p>
          </div>

          {adminChallenge ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-primary/10 p-4 text-sm text-foreground">
                Un code à 6 chiffres a été envoyé dans le groupe Telegram administrateur. Il est valable 3 minutes.
              </div>
              <Input
                value={adminCode}
                onChange={(event) => setAdminCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                className="h-14 text-center text-2xl font-bold tracking-[0.4em]"
                autoComplete="one-time-code"
              />
              <Button type="button" onClick={verifyAdminCode} className="w-full h-12" disabled={isSubmitting || adminCode.length !== 6}>
                {isSubmitting ? 'Vérification...' : 'Valider le code'}
              </Button>
              <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => { setAdminChallenge(null); setAdminCode(''); }}>
                Recommencer
              </button>
            </div>
          ) : <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="votre@email.com"
                        {...field}
                        data-testid="input-email"
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        data-testid="input-password"
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TurnstileWidget onToken={setCaptchaToken} />
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </Form>}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Pas encore de compte?{' '}
              <Link href="/register" className="text-primary font-semibold hover:underline" data-testid="link-register">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
