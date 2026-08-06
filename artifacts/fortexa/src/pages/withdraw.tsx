import { useState } from 'react';
import { useGetDashboard, useGetWithdrawals, useCreateWithdrawal, getGetWithdrawalsQueryKey, getGetDashboardQueryKey } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpCircle, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import type { TransactionStatus } from '@workspace/api-client-react';

const withdrawalSchema = z.object({
  amount: z.coerce.number().min(3000, 'Montant minimum: 3 000 FCFA'),
});

type WithdrawalForm = z.infer<typeof withdrawalSchema>;

const STATUS_CONFIG: Record<TransactionStatus, { label: string; icon: any; color: string }> = {
  pending: { label: 'En attente', icon: Clock, color: 'text-amber-600' },
  approved: { label: 'Approuvé', icon: CheckCircle, color: 'text-green-600' },
  rejected: { label: 'Rejeté', icon: XCircle, color: 'text-red-600' },
};

export default function WithdrawPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: dashboard } = useGetDashboard();
  const { data: withdrawals, isLoading } = useGetWithdrawals();
  const createWithdrawalMutation = useCreateWithdrawal();
  const [previewAmount, setPreviewAmount] = useState(0);

  const form = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 3000,
    },
  });

  const watchAmount = form.watch('amount');
  const fee = (watchAmount || 0) * ((dashboard?.settings.withdrawalFeePercent || 5) / 100);
  const netAmount = (watchAmount || 0) - fee;

  const onSubmit = (data: WithdrawalForm) => {
    const totalAvailable = (dashboard?.gainBalance || 0);
    
    if (data.amount > totalAvailable) {
      toast({
        title: 'Solde insuffisant',
        description: 'Votre solde de gains est insuffisant',
        variant: 'destructive',
      });
      return;
    }

    createWithdrawalMutation.mutate(
      { data: { amount: data.amount } },
      {
        onSuccess: () => {
          toast({
            title: 'Demande de retrait créée',
            description: 'Votre demande sera traitée sous peu',
          });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getGetWithdrawalsQueryKey() });
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
    <>
      <div className="bg-[#0D5C3D] py-8 px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <ArrowUpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Retrait</h1>
            <p className="text-white/80 text-sm">Retirer vos gains</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
          <h2 className="font-semibold text-foreground mb-4">Nouvelle demande</h2>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-1">Solde disponible (gains)</p>
            <p className="text-2xl font-bold text-primary" data-testid="text-available-balance">
              {formatCurrency(dashboard?.gainBalance || 0, 2)}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-medium">Frais de retrait: {dashboard?.settings.withdrawalFeePercent}%</p>
              <p className="text-amber-700 mt-0.5">Les frais seront déduits du montant retiré</p>
            </div>
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

              {watchAmount > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant demandé</span>
                    <span className="font-semibold">{formatCurrency(watchAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais ({dashboard?.settings.withdrawalFeePercent}%)</span>
                    <span className="font-semibold text-amber-600">-{formatCurrency(fee)}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between">
                    <span className="font-semibold">Montant net</span>
                    <span className="font-bold text-primary">{formatCurrency(netAmount)}</span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-[#0D5C3D] hover:bg-[#0D5C3D]/90"
                disabled={createWithdrawalMutation.isPending}
                data-testid="button-submit"
              >
                {createWithdrawalMutation.isPending ? 'Envoi...' : 'Créer la demande'}
              </Button>
            </form>
          </Form>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
          <h2 className="font-semibold text-foreground mb-4">Historique des retraits</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : withdrawals && withdrawals.length > 0 ? (
            <div className="space-y-3">
              {withdrawals.map(withdrawal => {
                const statusInfo = STATUS_CONFIG[withdrawal.status];
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div
                    key={withdrawal.id}
                    className="bg-muted/30 rounded-lg p-4 border border-border"
                    data-testid={`withdrawal-${withdrawal.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                        <span className={`text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{formatCurrency(withdrawal.amount)}</p>
                        <p className="text-xs text-muted-foreground">Net: {formatCurrency(withdrawal.netAmount)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(withdrawal.createdAt)}</p>
                    {withdrawal.rejectionReason && (
                      <p className="text-sm text-red-600 mt-2">{withdrawal.rejectionReason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ArrowUpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun retrait pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
