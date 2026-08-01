import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  phone: z.string().min(8, 'Numéro de téléphone invalide'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe requis (min 6 caractères)'),
  referralCode: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { setAuth, user } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      referralCode: '',
    },
  });

  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const onSubmit = (data: RegisterForm) => {
    const payload = {
      ...data,
      referralCode: data.referralCode || null,
    };
    
    registerMutation.mutate(
      { data: payload },
      {
        onSuccess: (response) => {
          setAuth(response.user, response.token);
          toast({
            title: 'Compte créé avec succès',
            description: `Bienvenue ${response.user.name}!`,
          });
          setLocation('/dashboard');
        },
        onError: (error: any) => {
          toast({
            title: 'Erreur d\'inscription',
            description: error.data?.error || 'Une erreur est survenue',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="gradient-green py-16 px-6 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Fortexa</h1>
        <p className="text-white/90 text-sm">Votre capital, nos résultats</p>
      </div>

      <div className="flex-1 px-6 py-8 -mt-6">
        <div className="bg-card rounded-2xl shadow-xl p-6 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Inscription</h2>
              <p className="text-sm text-muted-foreground">Créez votre compte</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Votre nom"
                        {...field}
                        data-testid="input-name"
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+237 6XX XXX XXX"
                        {...field}
                        data-testid="input-phone"
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code de parrainage (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Code de parrain"
                        {...field}
                        data-testid="input-referral"
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={registerMutation.isPending}
                data-testid="button-submit"
              >
                {registerMutation.isPending ? 'Création...' : 'Créer mon compte'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Vous avez déjà un compte?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline" data-testid="link-login">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
