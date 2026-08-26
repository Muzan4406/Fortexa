import { useEffect, useState } from 'react';
import {
  useGetDashboard, useCreateWithdrawal,
  useGetUsdtInfo,
  getGetDashboardQueryKey, getGetUsdtInfoQueryKey,
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
import { ALL_COUNTRIES, getCurrencyForCountry } from '@/lib/countries';
// ── Mobile Money countries (same 4 as deposit) ─────────────────────────────
const XOF_COUNTRY_CODES = new Set(['TG', 'BJ', 'BF', 'CI', 'Togo', 'Bénin', 'Burkina Faso', "Côte d'Ivoire"]);
const COUNTRY_NAMES: Record<string, string> = {
  TG: 'Togo',
  BJ: 'Bénin',
  BF: 'Burkina Faso',
  CI: "Côte d'Ivoire",
};
const MOBILE_MONEY_OPERATORS: Record<string, string[]> = {
  TG: ['Togocel', 'Moov Africa'],
  BJ: ['MTN Mobile Money', 'Moov Africa'],
  BF: ['Orange Money', 'Moov Africa'],
  CI: ['Orange Money', 'MTN MoMo', 'Moov Money', 'Wave'],
  Togo: ['Togocel', 'Moov Africa'],
  Bénin: ['MTN Mobile Money', 'Moov Africa'],
  'Burkina Faso': ['Orange Money', 'Moov Africa'],
  "Côte d'Ivoire": ['Orange Money', 'MTN MoMo', 'Moov Money', 'Wave'],
};

// ── Schemas ─────────────────────────────────────────────────────────────────
const mobileMoneySchema = z.object({
  // The country is read-only and comes from the authenticated account.
  // The API performs the authoritative country/method validation.
  country: z.string().optional(),
  operator: z.string().min(2, 'Opérateur Mobile Money requis'),
  amount: z.coerce.number().min(3000, 'Montant minimum : 3 000 FCFA'),
  phone: z.string().min(8, 'Numéro de téléphone invalide (minimum 8 chiffres)'),
  usdtAddress: z.string().optional(),
});

const usdtSchema = z.object({
  country: z.string().optional(),
  operator: z.string().optional(),
  amount: z.coerce.number().min(3000, 'Montant minimum : 3 000 FCFA'),
  usdtAddress: z.string().min(26, 'Adresse USDT invalide (minimum 26 caractères)'),
  phone: z.string().optional(),
});

const withdrawalSchema = z.object({
  country: z.string().min(1, 'Pays requis'),
  operator: z.string().optional(),
  amount: z.coerce.number().min(0.000001, 'Montant invalide'),
  phone: z.string().optional(),
  usdtAddress: z.string().optional(),
});

type WithdrawalForm = z.infer<typeof withdrawalSchema>;

export default function WithdrawPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: dashboard } = useGetDashboard();
  const createWithdrawalMutation = useCreateWithdrawal();

  // Detect country-based payment method
  const country = (user as any)?.country ?? '';
  const accountCountry = COUNTRY_NAMES[country] ?? country;
  const [selectedCountry, setSelectedCountry] = useState(accountCountry);
  const isMobileMoney = getCurrencyForCountry(selectedCountry) === 'FCFA (XOF)';
  const { data: usdtInfo } = useGetUsdtInfo({ query: { enabled: !!user && !isMobileMoney, queryKey: getGetUsdtInfoQueryKey() } });
  const usdtRate = usdtInfo?.usdtRate || 561;
  const minimumXof = dashboard?.settings.minWithdrawal || 3000;
  const minimumUsdt = minimumXof / usdtRate;

  const form = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      country: selectedCountry,
      operator: '',
      amount: isMobileMoney ? minimumXof : Number(minimumUsdt.toFixed(6)),
      phone: '',
      usdtAddress: '',
    },
  });

  useEffect(() => {
    if (accountCountry) {
      setSelectedCountry(accountCountry);
      form.setValue('country', accountCountry);
    }
  }, [accountCountry, form]);

  const watchAmount = form.watch('amount');
  const feePercent = dashboard?.settings.withdrawalFeePercent || 5;
  // Native number inputs emit strings while the user is editing. Normalize
  // before calling numeric methods such as toFixed or formatCurrency.
  const displayAmount = Number(watchAmount) || 0;
  const fee = displayAmount * (feePercent / 100);
  const netAmount = displayAmount - fee;

  const onSubmit = (data: WithdrawalForm) => {
    const totalAvailable = dashboard?.gainBalance || 0;
    const requestedXof = isMobileMoney ? data.amount : data.amount * usdtRate;
    if (requestedXof < minimumXof) {
      toast({ title: 'Montant minimum non atteint', description: `Le minimum est ${minimumUsdt.toFixed(2)} USDT`, variant: 'destructive' });
      return;
    }
    if (requestedXof > totalAvailable) {
      toast({ title: 'Solde insuffisant', description: 'Votre solde de gains est insuffisant', variant: 'destructive' });
      return;
    }

    const payload = isMobileMoney
      ? { amount: data.amount, country: selectedCountry, operator: data.operator, phone: data.phone }
      : { amount: requestedXof, country: selectedCountry, usdtAddress: data.usdtAddress };

    createWithdrawalMutation.mutate(
      { data: payload as any },
      {
        onSuccess: () => {
          toast({ title: 'Demande de retrait créée', description: 'Votre demande sera traitée sous peu' });
          form.reset();
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
           <div className="w-14 h-14 rounded-xl bg-rose-50 flex items-center justify-center overflow-hidden">
             <img src="/withdrawal-bank-transparent.png" alt="" className="h-14 w-14 object-contain" />
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
               {isMobileMoney ? formatCurrency(dashboard?.gainBalance || 0, 2) : `${((dashboard?.gainBalance || 0) / usdtRate).toFixed(6)} USDT`}
            </p>
             {!isMobileMoney && <p className="text-xs text-muted-foreground mt-1">Équivalent : {formatCurrency(dashboard?.gainBalance || 0, 2)} · 1 USDT ≈ {formatCurrency(usdtRate, 2)}</p>}
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

              {/* ── Mobile Money: country, operator and phone fields ── */}
              {isMobileMoney ? (
                <>
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays du retrait</FormLabel>
                        <FormControl>
                           <select {...field} onChange={(event) => { field.onChange(event); setSelectedCountry(event.target.value); }} className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                             {ALL_COUNTRIES.map((availableCountry) => (
                               <option key={availableCountry.name} value={availableCountry.name}>{availableCountry.name}</option>
                             ))}
                          </select>
                        </FormControl>
                        <FormDescription className="text-xs">Pays enregistré sur votre compte</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="operator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-600" />Opérateur Mobile Money</FormLabel>
                        <FormControl>
                          <select {...field} className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                            <option value="">Sélectionnez votre opérateur</option>
                             {(MOBILE_MONEY_OPERATORS[selectedCountry] ?? []).map((operator) => <option key={operator} value={operator}>{operator}</option>)}
                          </select>
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
                        <FormLabel>Numéro Mobile Money</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex : 90123456" type="tel" {...field} data-testid="input-phone" className="h-12 text-base font-mono" />
                        </FormControl>
                        <FormDescription className="text-xs">Numéro de téléphone enregistré sur votre compte Mobile Money</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
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
                    <FormLabel>Montant ({isMobileMoney ? 'FCFA' : 'USDT'})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                         placeholder={isMobileMoney ? '3000' : minimumUsdt.toFixed(2)}
                        {...field}
                        data-testid="input-amount"
                        className="h-12 text-lg font-semibold"
                      />
                    </FormControl>
                     <FormDescription className="text-xs">
                       Minimum : {isMobileMoney ? formatCurrency(minimumXof) : `${minimumUsdt.toFixed(2)} USDT`}
                     </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Summary */}
              {watchAmount > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant demandé</span>
                     <span className="font-semibold">{isMobileMoney ? formatCurrency(displayAmount) : `${displayAmount.toFixed(6)} USDT`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais ({feePercent}%)</span>
                     <span className="font-semibold text-amber-600">-{isMobileMoney ? formatCurrency(fee) : `${fee.toFixed(6)} USDT`}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between">
                    <span className="font-semibold">Montant net</span>
                   <span className="font-bold text-primary">{isMobileMoney ? formatCurrency(netAmount) : `${netAmount.toFixed(6)} USDT`}</span>
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

      </div>
    </>
  );
}
