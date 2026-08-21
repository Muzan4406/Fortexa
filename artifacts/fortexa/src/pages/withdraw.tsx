import { useState } from 'react';
import {
  useGetDashboard, useGetWithdrawals, useCreateWithdrawal,
  getGetWithdrawalsQueryKey, getGetDashboardQueryKey,
} from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpCircle, CheckCircle, Clock, XCircle, AlertCircle, Smartphone, Wallet } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import type { TransactionStatus } from '@workspace/api-client-react';

// ── Mobile Money countries (same 4 as deposit) ─────────────────────────────
const XOF_COUNTRY_CODES = new Set(['TG', 'BJ', 'BF', 'CI']);

// ── Schemas ─────────────────────────────────────────────────────────────────
const mobileMoneySchema = z.object({
  amount: z.coerce.number().min(3000, 'Montant minimum : 3 000 FCFA'),
  phone: z.string().min(8, 'Numéro de téléphone invalide (minimum 8 chiffres)'),
  usdtAddress: z.string().optional(),
});

const usdtSchema = z.object({
  amount: z.coerce.number().min(3000, 'Montant minimum : 3 000 FCFA'),
  usdtAddress: z.string().min(26, 'Adresse USDT invalide (minimum 26 caractères)'),
  phone: z.string().optional(),
});

type WithdrawalForm = z.infer<typeof mobileMoneySchema>;

const STATUS_CONFIG: Record<TransactionStatus, { label: string; icon: any; color: string }> = {
  pending:  { label: 'En attente', icon: Clock,        color: 'text-amber-500' },
  approved: { label: 'Approuvé',   icon: CheckCircle,  color: 'text-emerald-500' },
  rejected: { label: 'Rejeté',     icon: XCircle,      color: 'text-red-500' },
};

export default function WithdrawPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: dashboard } = useGetDashboard();
  const { data: withdrawals, isLoading } = useGetWithdrawals();
  const createWithdrawalMutation = useCreateWithdrawal();

  // Detect country-based payment method
  const country = (user as any)?.country ?? '';
  const isMobileMoney = XOF_COUNTRY_CODES.has(country);

  const form = useForm<WithdrawalForm>({
    resolver: zodResolver(isMobileMoney ? mobileMoneySchema : usdtSchema),
    defaultValues: {
      amount: 3000,
      phone: '',
      usdtAddress: '',
    },
  });

  const watchAmount = form.watch('amount');
  const feePercent = dashboard?.settings.withdrawalFeePercent || 5;
  const fee = (watchAmount || 0) * (feePercent / 100);
  const netAmount = (watchAmount || 0) - fee;

  const onSubmit = (data: WithdrawalForm) => {
    const totalAvailable = dashboard?.gainBalance || 0;
    if (data.amount > totalAvailable) {
      toast({ title: 'Solde insuffisant', description: 'Votre solde de gains est insuffisant', variant: 'destructive' });
      return;
    }

    const payload = isMobileMoney
      ? { amount: data.amount, phone: data.phone }
      : { amount: data.amount, usdtAddress: data.usdtAddress };

    createWithdrawalMutation.mutate(
      { data: payload as any },
      {
        onSuccess: () => {
          toast({ title: 'Demande de retrait créée', description: 'Votre demande sera traitée sous peu' });
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
      {/* ── Header ── */}
      <div className="bg-background border-b border-border py-8 px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
            <ArrowUpCircle className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Retrait</h1>
            <p className="text-muted-foreground text-sm">Retirer vos gains</p>
          </div>
        </div>

        {/* Payment method badge */}
        <div
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={isMobileMoney
            ? { background: 'rgba(52,211,153,0.1)', color: '#10b981', border: '1px solid rgba(52,211,153,0.25)' }
            : { background: 'rgba(251,191,36,0.1)', color: '#f59e0b', border: '1px solid rgba(251,191,36,0.25)' }
          }
        >
          {isMobileMoney ? <Smartphone className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
          {isMobileMoney ? 'Retrait Mobile Money' : 'Retrait USDT BEP20'}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── New withdrawal card ── */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
          <h2 className="font-semibold text-foreground mb-4">Nouvelle demande</h2>

          {/* Available balance */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-1">Solde disponible (gains)</p>
            <p className="text-2xl font-bold text-primary" data-testid="text-available-balance">
              {formatCurrency(dashboard?.gainBalance || 0, 2)}
            </p>
          </div>

          {/* Fee notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-medium">Frais de retrait : {feePercent}%</p>
              <p className="text-amber-700 mt-0.5">Les frais seront déduits du montant retiré</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* ── Mobile Money: phone field ── */}
              {isMobileMoney ? (
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        Numéro Mobile Money
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex : 90123456"
                          type="tel"
                          {...field}
                          data-testid="input-phone"
                          className="h-12 text-base font-mono"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Numéro de téléphone enregistré sur votre compte Mobile Money
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                /* ── USDT: address field ── */
                <FormField
                  control={form.control}
                  name="usdtAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-amber-500" />
                        Adresse USDT BEP20
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0x..."
                          {...field}
                          data-testid="input-usdt-address"
                          className="h-12 font-mono text-sm"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Adresse de votre portefeuille USDT sur le réseau BEP20 (BSC)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Amount */}
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

              {/* Summary */}
              {watchAmount > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant demandé</span>
                    <span className="font-semibold">{formatCurrency(watchAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais ({feePercent}%)</span>
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
                {createWithdrawalMutation.isPending ? 'Envoi…' : 'Créer la demande'}
              </Button>
            </form>
          </Form>
        </div>

        {/* ── Withdrawal history ── */}
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
                        <p className="text-xs text-muted-foreground">Net : {formatCurrency(withdrawal.netAmount)}</p>
                      </div>
                    </div>
                    {withdrawal.description && (
                      <p className="text-xs text-muted-foreground mb-1 font-mono truncate">{withdrawal.description}</p>
                    )}
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
