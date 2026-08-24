import { Wrench } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function MaintenancePage({ message }: { message?: string }) {
  const { clearAuth } = useAuth();
  return (
    <main className="min-h-[100dvh] bg-background px-6 py-16 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <Wrench className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Site en maintenance</h1>
        <p className="mt-3 text-muted-foreground">Nous améliorons actuellement Fortexa pour vous offrir une meilleure expérience.</p>
        <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-foreground">
          {message || 'Le site est temporairement en maintenance. Merci de revenir bientôt.'}
        </p>
        <button onClick={clearAuth} className="mt-6 text-sm font-semibold text-primary hover:underline">Se déconnecter</button>
      </section>
    </main>
  );
}