import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe requis (min 6 caractères)'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setAuth, user } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

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

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          setAuth(response.user, response.token);
          toast({
            title: 'Connexion réussie',
            description: `Bienvenue ${response.user.name}`,
          });
          window.setTimeout(() => setLocation('/dashboard'), 350);
        },
        onError: (error: any) => {
          toast({
            title: 'Erreur de connexion',
            description: error.data?.error || 'Email ou mot de passe incorrect',
            variant: 'destructive',
          });
        },
      }
    );
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

          <Form {...form}>
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

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={loginMutation.isPending}
                data-testid="button-submit"
              >
                {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </Form>

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
