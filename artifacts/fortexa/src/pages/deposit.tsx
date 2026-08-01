import { UserLayout } from '@/components/user-layout';
import { useGetDashboard, useGetDeposits, useCreateDeposit, getGetDepositsQueryKey, getGetDashboardQueryKey } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import type { TransactionStatus } from '@workspace/api-client-react';

const depositSchema = z.object({
  amount: z.coerce.number().min(3000, 'Montant minimum: 3 000 FCFA'),
});

type DepositForm = z.infer<typeof depositSchema>;

const STATUS_CONFIG: Record<TransactionStatus, { label: string; icon: any; color: string }> = {
  pending: { label: 'En attente', icon: Clock, color: 'text-amber-600' },
  approved: { label: 'Approuvé', icon: CheckCircle, color: 'text-green-600' },
  rejected: { label: 'Rejeté', icon: XCircle, color: 'text-red-600' },
};

export default function DepositPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: dashboard } = useGetDashboard();
  const { data: deposits, isLoading } = useGetDeposits();
  const createDepositMutation = useCreateDeposit();

  const form = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 3000,
    },
  });

  const onSubmit = (data: DepositForm) => {
    createDepositMutation.mutate(
      { data: { amount: data.amount } },
      {
        onSuccess: () => {
          toast({
            title: 'Demande de dépôt créée',
            description: 'Votre demande sera traitée sous peu',
          });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getGetDepositsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (error: any) => {
          toast({
            title: 'Erreur',
            description: error.data?.error || 'Une erreur est survenue',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <UserLayout>
      <div className="gradient-green py-8 px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <ArrowDownCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dépôt</h1>
            <p className="text-white/80 text-sm">Alimenter votre capital</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
          <h2 className="font-semibold text-foreground mb-4">Nouvelle demande</h2>
          
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-1">Montant minimum</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(dashboard?.settings.minDeposit || 3000)}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (FCFA)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3000"
                        {...field}
                        data-testid="input-amount"
                        className="h-12 text-lg font-semibold"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-accent hover:bg-accent/90"
                disabled={createDepositMutation.isPending}
                data-testid="button-submit"
              >
                {createDepositMutation.isPending ? 'Envoi...' : 'Créer la demande'}
              </Button>
            </form>
          </Form>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
          <h2 className="font-semibold text-foreground mb-4">Historique des dépôts</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : deposits && deposits.length > 0 ? (
            <div className="space-y-3">
              {deposits.map(deposit => {
                const statusInfo = STATUS_CONFIG[deposit.status];
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div
                    key={deposit.id}
                    className="bg-muted/30 rounded-lg p-4 border border-border"
                    data-testid={`deposit-${deposit.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                        <span className={`text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-foreground">
                        {formatCurrency(deposit.amount)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(deposit.createdAt)}</p>
                    {deposit.rejectionReason && (
                      <p className="text-sm text-red-600 mt-2">{deposit.rejectionReason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ArrowDownCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun dépôt pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
