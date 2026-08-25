import { useState, useEffect, useRef, useCallback } from 'react';
import {
  useGetDashboard,
  useInitiateDeposit,
  useConfirmDeposit,
  useSubmitDepositOtp,
  useGetUsdtInfo,
  useCreateUsdtDeposit,
  getGetDashboardQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDownCircle,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Smartphone,
  Bitcoin,
  ArrowLeft,
  Upload,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

// ─── Country data ─────────────────────────────────────────────────────────────

const XOF_COUNTRY_CODES = new Set(['TG', 'BJ', 'BF', 'CI']);

const COUNTRIES = [
  { code: 'TG', name: 'Togo', flag: '🇹🇬', method: 'xof' as const },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', method: 'xof' as const },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', method: 'xof' as const },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', method: 'xof' as const },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', method: 'usdt' as const },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', method: 'usdt' as const },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', method: 'usdt' as const },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', method: 'usdt' as const },
  { code: 'CD', name: 'RD Congo', flag: '🇨🇩', method: 'usdt' as const },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', method: 'usdt' as const },
  { code: 'NG', name: 'Nigéria', flag: '🇳🇬', method: 'usdt' as const },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', method: 'usdt' as const },
  { code: 'OTHER', name: 'Autre pays', flag: '🌍', method: 'usdt' as const },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Flow = 'xof' | 'usdt';

type Step =
  | 'form'
  | 'confirm'
  | 'otp'
  | 'processing'
  | 'success'
  | 'failed'
  | 'usdt-address'
  | 'usdt-submit'
  | 'usdt-pending';

interface FormState {
  country: string;
  phone: string;
  amount: string;
}

interface XofSession {
  transactionId: number;
  reference: string;
  amount: number;
  payerCountry: string;
  payerPhone: string;
  operators: Array<{ id: string; name: string; requiresOtp: boolean; status: string }>;
  selectedOperator: string;
  otpToken: string | null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DepositPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('form');
  const [flow, setFlow] = useState<Flow>('xof');
  const [form, setForm] = useState<FormState>({ country: '', phone: '', amount: '' });
  const [xofSession, setXofSession] = useState<XofSession | null>(null);
  const [otp, setOtp] = useState('');
  const [txid, setTxid] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Server data ───────────────────────────────────────────────────────────
  const { data: dashboard } = useGetDashboard();
  const { data: usdtInfo } = useGetUsdtInfo();

  // ── Mutations ─────────────────────────────────────────────────────────────
  const initiateMutation = useInitiateDeposit();
  const confirmMutation = useConfirmDeposit();
  const otpMutation = useSubmitDepositOtp();
  const usdtMutation = useCreateUsdtDeposit();

  // ── Derived ───────────────────────────────────────────────────────────────
  const minDeposit = dashboard?.settings?.minDeposit ?? 3000;
  const selectedCountry = COUNTRIES.find((c) => c.code === form.country);
  const usdtRate = usdtInfo?.usdtRate ?? 655;
  const isUsdtFlow = flow === 'usdt';
  const minimumDisplayAmount = isUsdtFlow ? (minDeposit / usdtRate).toFixed(2) : String(minDeposit);
  const enteredDisplayAmount = parseFloat(form.amount) || 0;
  const amountInFcfa = isUsdtFlow ? enteredDisplayAmount * usdtRate : enteredDisplayAmount;
  const usdtAmount = usdtInfo && form.amount
    ? (isUsdtFlow ? enteredDisplayAmount : enteredDisplayAmount / usdtRate).toFixed(2)
    : '—';

  // ── Polling for XOF payment status ───────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((transactionId: number) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('fortexa_token');
        const apiBasePath = import.meta.env.BASE_URL.replace(/\/+$/, '');
        const res = await fetch(`${apiBasePath}/api/deposits/${transactionId}/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'approved') {
          stopPolling();
          setPollingStatus('approved');
          setStep('success');
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        } else if (data.status === 'rejected') {
          stopPolling();
          setPollingStatus('rejected');
          setStep('failed');
        }
      } catch {
        // Continue polling on network errors
      }
    }, 5000);
  }, [stopPolling, queryClient]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCountryChange(code: string) {
    const country = COUNTRIES.find((c) => c.code === code);
    const newFlow = country?.method ?? 'usdt';
    setForm((f) => ({ ...f, country: code }));
    setFlow(newFlow);
  }

  function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Step 1 → Step 2
  async function handleContinue() {
    const enteredAmount = parseFloat(form.amount);
    const amount = isUsdtFlow ? enteredAmount * usdtRate : enteredAmount;
    if (!form.country) { toast({ title: 'Sélectionnez un pays', variant: 'destructive' }); return; }
    if (!enteredAmount || amount < minDeposit) {
      toast({ title: `Montant minimum : ${minimumDisplayAmount} ${isUsdtFlow ? 'USDT' : 'FCFA'}`, variant: 'destructive' }); return;
    }

    if (flow === 'usdt') {
      setStep('usdt-address');
      return;
    }

    // XOF — call Sendavapay
    if (!form.phone || !/^\d{6,12}$/.test(form.phone.trim())) {
      toast({ title: 'Numéro invalide', description: 'Entrez votre numéro sans indicatif (chiffres uniquement)', variant: 'destructive' });
      return;
    }

    initiateMutation.mutate(
      { data: { amount, payerCountry: form.country, payerPhone: form.phone.trim() } },
      {
        onSuccess: (res) => {
          setXofSession({
            transactionId: res.transactionId,
            reference: res.reference,
            amount: res.amount,
            payerCountry: res.payerCountry,
            payerPhone: res.payerPhone,
            operators: (res.operators ?? []).map((op) => ({ ...op, requiresOtp: op.requiresOtp ?? false })),
            selectedOperator: res.operators[0]?.id ?? '',
            otpToken: null,
          });
          setStep('confirm');
        },
        onError: (e: any) => {
          toast({ title: 'Erreur', description: e.data?.error || 'Impossible de créer le paiement', variant: 'destructive' });
        },
      }
    );
  }

  // Step 2 → Step 3 (or OTP)
  function handlePayNow() {
    if (!xofSession) return;
    if (!xofSession.selectedOperator) {
      toast({ title: 'Sélectionnez un opérateur', variant: 'destructive' }); return;
    }

    confirmMutation.mutate(
      { data: { transactionId: xofSession.transactionId, operatorId: xofSession.selectedOperator } },
      {
        onSuccess: (res) => {
          if (res.requiresRedirect && res.redirectUrl) {
            // Wave and similar — open redirect URL in new tab
            window.open(res.redirectUrl, '_blank');
            setStep('processing');
            startPolling(xofSession.transactionId);
          } else if (res.requiresOtp && res.otpToken) {
            setXofSession((s) => s ? { ...s, otpToken: res.otpToken ?? null } : s);
            setStep('otp');
          } else {
            setStep('processing');
            startPolling(xofSession.transactionId);
          }
        },
        onError: (e: any) => {
          toast({ title: 'Erreur de paiement', description: e.data?.error || 'Impossible d\'initier le paiement', variant: 'destructive' });
        },
      }
    );
  }

  // OTP step
  function handleSubmitOtp() {
    if (!xofSession?.otpToken || !otp.trim()) {
      toast({ title: 'Entrez votre code OTP', variant: 'destructive' }); return;
    }

    otpMutation.mutate(
      { data: { otpToken: xofSession.otpToken, otp: otp.trim() } },
      {
        onSuccess: () => {
          setStep('processing');
          startPolling(xofSession.transactionId);
        },
        onError: (e: any) => {
          toast({ title: 'OTP incorrect', description: e.data?.error || 'Code invalide', variant: 'destructive' });
        },
      }
    );
  }

  // USDT — submit TXID + screenshot
  async function handleUsdtSubmit() {
    if (!txid.trim() || txid.trim().length < 10) {
      toast({ title: 'TXID invalide', description: 'Entrez le hash de transaction complet', variant: 'destructive' }); return;
    }
    if (!screenshot || !screenshotPreview) {
      toast({ title: 'Capture d\'écran requise', variant: 'destructive' }); return;
    }

    usdtMutation.mutate(
      {
        data: {
          amount: amountInFcfa,
          payerCountry: form.country,
          txid: txid.trim(),
          screenshotBase64: screenshotPreview,
        },
      },
      {
        onSuccess: () => {
          setStep('usdt-pending');
        },
        onError: (e: any) => {
          toast({ title: 'Erreur', description: e.data?.error || 'Impossible d\'envoyer la demande', variant: 'destructive' });
        },
      }
    );
  }

  function reset() {
    stopPolling();
    setStep('form');
    setFlow('xof');
    setForm({ country: '', phone: '', amount: '' });
    setXofSession(null);
    setOtp('');
    setTxid('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setPollingStatus('pending');
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copié !` });
  }

  // ── Render steps ──────────────────────────────────────────────────────────

  const renderStep = () => {
    // ── Step 1: Form ────────────────────────────────────────────────────────
    if (step === 'form') {
      return (
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-5">
          <h2 className="font-semibold text-foreground">Nouvelle demande de dépôt</h2>

          <div className="space-y-2">
            <Label>Pays</Label>
            <Select value={form.country} onValueChange={handleCountryChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Sélectionnez votre pays" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Mobile Money (XOF)
                </div>
                {COUNTRIES.filter((c) => c.method === 'xof').map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </SelectItem>
                ))}
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1 border-t border-border">
                  USDT (BEP20)
                </div>
                {COUNTRIES.filter((c) => c.method === 'usdt').map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {form.country && (
              <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                flow === 'xof' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {flow === 'xof' ? <Smartphone className="w-3.5 h-3.5" /> : <Bitcoin className="w-3.5 h-3.5" />}
                {flow === 'xof' ? 'Paiement Mobile Money automatique' : 'Dépôt USDT (BEP20) — vérification manuelle'}
              </div>
            )}
          </div>

          {flow === 'xof' && (
            <div className="space-y-2">
              <Label>Numéro Mobile Money</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  {form.country === 'TG' ? '+228' : form.country === 'BJ' ? '+229' : form.country === 'BF' ? '+226' : form.country === 'CI' ? '+225' : ''}
                </span>
                <Input
                  type="tel"
                  placeholder="90123456"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                  className="h-12 pl-16"
                  inputMode="numeric"
                />
              </div>
              <p className="text-xs text-muted-foreground">Sans l'indicatif du pays</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Montant ({isUsdtFlow ? 'USDT' : 'FCFA'})</Label>
            <Input
              type="number"
              placeholder={`Minimum ${minimumDisplayAmount} ${isUsdtFlow ? 'USDT' : 'FCFA'}`}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="h-12 text-lg font-semibold"
              inputMode="numeric"
              min={isUsdtFlow ? Number(minimumDisplayAmount) : minDeposit}
              step={isUsdtFlow ? '0.01' : '1'}
            />
            <p className="text-xs text-muted-foreground">
              Minimum : {minimumDisplayAmount} {isUsdtFlow ? 'USDT' : 'FCFA'}
            </p>
          </div>

          {flow === 'xof' && (
            <p className="text-xs text-muted-foreground text-center -mb-1">
              L'opérateur Mobile Money sera sélectionné à l'étape suivante.
            </p>
          )}

          <Button
            className="w-full h-12 text-base font-semibold bg-accent hover:bg-accent/90"
            onClick={handleContinue}
            disabled={initiateMutation.isPending}
          >
            {initiateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Traitement...</>
            ) : (
              'Continuer ➡'
            )}
          </Button>
        </div>
      );
    }

    // ── Step 2: Confirm (XOF) ────────────────────────────────────────────────
    if (step === 'confirm' && xofSession) {
      const country = COUNTRIES.find((c) => c.code === xofSession.payerCountry);
      return (
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('form')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-foreground">Confirmation du paiement</h2>
          </div>

          {/* Recap */}
          <div className="bg-muted/40 rounded-xl divide-y divide-border">
            {[
              { label: 'Pays', value: `${country?.flag} ${country?.name}` },
              { label: 'Numéro de paiement', value: xofSession.payerPhone },
              { label: 'Montant', value: formatCurrency(xofSession.amount) },
              { label: 'Moyen de paiement', value: 'Mobile Money' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Operator selection */}
          {xofSession.operators.length > 0 && (
            <div className="space-y-2">
              <Label>Opérateur Mobile Money</Label>
              <Select
                value={xofSession.selectedOperator}
                onValueChange={(v) => setXofSession((s) => s ? { ...s, selectedOperator: v } : s)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choisissez votre opérateur" />
                </SelectTrigger>
                <SelectContent>
                  {xofSession.operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name}
                      {op.requiresOtp && <span className="ml-2 text-xs text-muted-foreground">(OTP requis)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {xofSession.operators.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">Aucun opérateur disponible pour ce pays. Réessayez plus tard.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep('form')} className="h-12">
              Retour
            </Button>
            <Button
              className="h-12 font-semibold bg-accent hover:bg-accent/90"
              onClick={handlePayNow}
              disabled={confirmMutation.isPending || xofSession.operators.length === 0}
            >
              {confirmMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi...</>
              ) : (
                '✅ Payer maintenant'
              )}
            </Button>
          </div>
        </div>
      );
    }

    // ── OTP Step ─────────────────────────────────────────────────────────────
    if (step === 'otp') {
      return (
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-5">
          <h2 className="font-semibold text-foreground text-center">Code OTP</h2>
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Un code OTP a été envoyé par SMS sur votre téléphone. Saisissez-le ci-dessous pour confirmer le paiement.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Code OTP</Label>
            <Input
              type="text"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="h-14 text-center text-2xl font-bold tracking-widest"
              maxLength={8}
              inputMode="numeric"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep('confirm')} className="h-12">
              Retour
            </Button>
            <Button
              className="h-12 font-semibold bg-accent hover:bg-accent/90"
              onClick={handleSubmitOtp}
              disabled={otpMutation.isPending || !otp.trim()}
            >
              {otpMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Vérification...</>
              ) : (
                'Valider le code'
              )}
            </Button>
          </div>
        </div>
      );
    }

    // ── Step 3: Processing (XOF) ──────────────────────────────────────────────
    if (step === 'processing') {
      return (
        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border text-center space-y-6">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Paiement en cours...</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Une demande de paiement de{' '}
              <span className="font-semibold text-foreground">{xofSession && formatCurrency(xofSession.amount)}</span>{' '}
              a été envoyée sur votre téléphone.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Veuillez confirmer l'opération avec votre code secret Mobile Money.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-xs text-muted-foreground">
            Cette page se met à jour automatiquement. Ne la fermez pas.
          </p>
        </div>
      );
    }

    // ── Step 4: Success ──────────────────────────────────────────────────────
    if (step === 'success') {
      return (
        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Paiement réussi !</h2>
            <p className="text-muted-foreground text-sm">
              Votre dépôt de{' '}
              <span className="font-semibold text-foreground">{xofSession && formatCurrency(xofSession.amount)}</span>{' '}
              a été validé automatiquement.
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Le montant a été ajouté à votre solde d'investissement et les commissions de parrainage ont été distribuées.
            </p>
          </div>
          <Button className="w-full h-12 bg-accent hover:bg-accent/90 font-semibold" onClick={reset}>
            Continuer
          </Button>
        </div>
      );
    }

    // ── Step 4: Failed ──────────────────────────────────────────────────────
    if (step === 'failed') {
      return (
        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Paiement échoué</h2>
            <p className="text-muted-foreground text-sm">
              Le paiement n'a pas pu être effectué. Vérifiez votre solde Mobile Money et réessayez.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12" onClick={reset}>
              <XCircle className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button className="h-12 bg-accent hover:bg-accent/90 font-semibold" onClick={() => {
              stopPolling();
              setStep('form');
            }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
            </Button>
          </div>
        </div>
      );
    }

    // ── USDT Step 2: Address ─────────────────────────────────────────────────
    if (step === 'usdt-address') {
      const address = usdtInfo?.address || '';
      return (
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('form')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-foreground">Dépôt USDT (BEP20)</h2>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Bitcoin className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Réseau BEP20 (BSC) uniquement</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Adresse USDT (BEP20)</p>
              <p className="font-mono text-xs text-foreground break-all bg-white rounded-lg p-2 border">
                {address || 'Chargement...'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-2"
                onClick={() => copyToClipboard(address, "Adresse")}
                disabled={!address}
              >
                <Copy className="w-3.5 h-3.5" /> 📋 Copier l'adresse
              </Button>
            </div>
          </div>

          <div className="bg-muted/40 rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Montant FCFA</span>
              <span className="text-sm font-semibold">{formatCurrency(amountInFcfa)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Montant USDT</span>
              <span className="text-sm font-bold text-blue-700">≈ {usdtAmount} USDT</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Taux indicatif</span>
              <span className="text-sm text-muted-foreground">1 USDT ≈ {usdtRate} FCFA</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-800 leading-relaxed">
              ⚠️ Envoyez <strong>exactement {usdtAmount} USDT</strong> sur le réseau <strong>BEP20</strong>.
              Tout envoi sur un autre réseau sera perdu.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12" onClick={() => setStep('form')}>Retour</Button>
            <Button
              className="h-12 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setStep('usdt-submit')}
            >
              J'ai effectué le dépôt
            </Button>
          </div>
        </div>
      );
    }

    // ── USDT Step 3: Submit TXID + Screenshot ────────────────────────────────
    if (step === 'usdt-submit') {
      return (
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('usdt-address')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-foreground">Prouver le transfert</h2>
          </div>

          <div className="space-y-2">
            <Label>Hash de transaction (TXID) <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              placeholder="0x..."
              value={txid}
              onChange={(e) => setTxid(e.target.value)}
              className="h-12 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Le hash complet de la transaction blockchain</p>
          </div>

          <div className="space-y-2">
            <Label>Capture d'écran de la transaction <span className="text-red-500">*</span></Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotChange}
              className="hidden"
            />
            {screenshotPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={screenshotPreview} alt="Capture" className="w-full h-48 object-cover" />
                <button
                  onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-accent hover:text-accent transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm">Cliquez pour uploader une image</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12" onClick={() => setStep('usdt-address')}>Retour</Button>
            <Button
              className="h-12 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleUsdtSubmit}
              disabled={usdtMutation.isPending}
            >
              {usdtMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi...</>
              ) : (
                'Envoyer'
              )}
            </Button>
          </div>
        </div>
      );
    }

    // ── USDT Step 4: Pending ─────────────────────────────────────────────────
    if (step === 'usdt-pending') {
      return (
        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">En attente de validation</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Votre dépôt USDT a été soumis et est en cours de vérification par l'administrateur.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Une fois vérifié, le montant sera crédité sur votre solde d'investissement et les commissions de parrainage seront distribuées.
            </p>
          </div>
          <Button className="w-full h-12 bg-accent hover:bg-accent/90 font-semibold" onClick={reset}>
            Continuer
          </Button>
        </div>
      );
    }

    return null;
  };

  // ── Full page render ───────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="bg-background border-b border-border py-8 px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
            <ArrowDownCircle className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dépôt</h1>
            <p className="text-muted-foreground text-sm">Alimentez votre capital</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Minimum</p>
            <p className="mt-1 text-sm font-bold text-blue-950">
              {isUsdtFlow ? `${minimumDisplayAmount} USDT` : formatCurrency(minDeposit)}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Crédit</p>
            <p className="mt-1 text-sm font-bold text-rose-950">Après validation</p>
          </div>
        </div>
        {/* Step content */}
        {renderStep()}

      </div>
    </>
  );
}
