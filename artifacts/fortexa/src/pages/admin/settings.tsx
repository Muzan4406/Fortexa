import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import {
  useGetAdminSettings, useUpdateAdminSettings,
  useGetAdminAnnouncements, useCreateAnnouncement,
  useUpdateAnnouncement, useDeleteAnnouncement,
  getGetAdminSettingsQueryKey, getGetAdminAnnouncementsQueryKey,
} from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Settings, Bell, Trash2, ToggleLeft, ToggleRight, CreditCard, Eye, EyeOff, CheckCircle2, MessageCircle, Send, UsersRound } from 'lucide-react';

const settingsSchema = z.object({
  dailyRatePercent: z.coerce.number().min(0).max(100),
  maxCapital: z.coerce.number().min(1),
  minDeposit: z.coerce.number().min(1),
  minWithdrawal: z.coerce.number().min(1),
  withdrawalFeePercent: z.coerce.number().min(0).max(100),
  gainsActive: z.boolean(),
  level1Percent: z.coerce.number().min(0).max(100),
  level2Percent: z.coerce.number().min(0).max(100),
  level3Percent: z.coerce.number().min(0).max(100),
});

const paymentSchema = z.object({
  sendavapayKey: z.string(),
  sendavapayWebhookSecret: z.string(),
  ashtechpayKey: z.string(),
  activeDepositProvider: z.enum(['sendavapay', 'ashtechpay']),
  usdtAddress: z.string(),
});

const socialSchema = z.object({
  telegramGroupUrl: z.string(),
  telegramChannelUrl: z.string(),
  whatsappGroupUrl: z.string(),
  whatsappChannelUrl: z.string(),
  whatsappSupportUrl: z.string(),
});

const announcementSchema = z.object({
  title: z.string().min(2, 'Titre requis'),
  message: z.string().min(5, 'Message requis'),
});

type SettingsForm = z.infer<typeof settingsSchema>;
type PaymentForm = z.infer<typeof paymentSchema>;
type SocialForm = z.infer<typeof socialSchema>;
type AnnouncementForm = z.infer<typeof announcementSchema>;

function getSettingsErrorMessage(error: any, fallback = 'Impossible de sauvegarder les paramètres') {
  return error?.data?.error || error?.message || fallback;
}

function SecretInput({ placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettingsMutation = useUpdateAdminSettings();

  const { data: announcements = [] } = useGetAdminAnnouncements();

  const createAnnouncementMutation = useCreateAnnouncement();
  const updateAnnouncementMutation = useUpdateAnnouncement();
  const deleteAnnouncementMutation = useDeleteAnnouncement();

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      dailyRatePercent: 3,
      maxCapital: 200000,
      minDeposit: 3000,
      minWithdrawal: 3000,
      withdrawalFeePercent: 5,
      gainsActive: true,
      level1Percent: 5,
      level2Percent: 2,
      level3Percent: 1,
    },
  });

  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      sendavapayKey: '',
      sendavapayWebhookSecret: '',
      ashtechpayKey: '',
      activeDepositProvider: 'sendavapay',
      usdtAddress: '',
    },
  });
  const socialForm = useForm<SocialForm>({
    resolver: zodResolver(socialSchema),
    defaultValues: { telegramGroupUrl: '', telegramChannelUrl: '', whatsappGroupUrl: '', whatsappChannelUrl: '', whatsappSupportUrl: '' },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        dailyRatePercent: settings.dailyRatePercent,
        maxCapital: settings.maxCapital,
        minDeposit: settings.minDeposit,
        minWithdrawal: settings.minWithdrawal,
        withdrawalFeePercent: settings.withdrawalFeePercent,
        gainsActive: settings.gainsActive,
        level1Percent: settings.level1Percent,
        level2Percent: settings.level2Percent,
        level3Percent: settings.level3Percent,
      });
      paymentForm.reset({
        sendavapayKey: '',
        sendavapayWebhookSecret: '',
        ashtechpayKey: '',
        activeDepositProvider: settings.activeDepositProvider === 'ashtechpay' ? 'ashtechpay' : 'sendavapay',
        usdtAddress: settings.usdtAddress ?? '',
      });
      socialForm.reset({
        telegramGroupUrl: settings.telegramGroupUrl ?? '',
        telegramChannelUrl: settings.telegramChannelUrl ?? '',
        whatsappGroupUrl: settings.whatsappGroupUrl ?? '',
        whatsappChannelUrl: settings.whatsappChannelUrl ?? '',
        whatsappSupportUrl: settings.whatsappSupportUrl ?? '',
      });
    }
  }, [settings, form, paymentForm, socialForm]);

  const announcementForm = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', message: '' },
  });

  const onSettingsSubmit = (data: SettingsForm) => {
    updateSettingsMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: 'Paramètres mis à jour' });
          queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
        },
        onError: (err: any) => toast({ title: 'Erreur', description: getSettingsErrorMessage(err), variant: 'destructive' }),
      }
    );
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    // Only send fields that have values — prevents accidental clearing
    const payload: Record<string, string> = {};
    if (data.sendavapayKey.trim()) payload.sendavapayKey = data.sendavapayKey.trim();
    if (data.sendavapayWebhookSecret.trim()) payload.sendavapayWebhookSecret = data.sendavapayWebhookSecret.trim();
    if (data.ashtechpayKey.trim()) payload.ashtechpayKey = data.ashtechpayKey.trim();
    payload.activeDepositProvider = data.activeDepositProvider;
    payload.usdtAddress = data.usdtAddress.trim();

    updateSettingsMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({ title: 'Paramètres de paiement mis à jour' });
          // Clear sensitive fields after save
          paymentForm.setValue('sendavapayKey', '');
          paymentForm.setValue('sendavapayWebhookSecret', '');
          paymentForm.setValue('ashtechpayKey', '');
          queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
        },
        onError: (err: any) => toast({ title: 'Erreur', description: getSettingsErrorMessage(err), variant: 'destructive' }),
      }
    );
  };

  const onSocialSubmit = (data: SocialForm) => {
    updateSettingsMutation.mutate(
      { data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.trim()])) },
      {
        onSuccess: () => {
          toast({ title: 'Liens sociaux mis à jour' });
          queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
        },
        onError: (err: any) => toast({ title: 'Erreur', description: getSettingsErrorMessage(err, 'Impossible de sauvegarder les liens'), variant: 'destructive' }),
      },
    );
  };

  const onAnnouncementCreate = (data: AnnouncementForm) => {
    createAnnouncementMutation.mutate(
      { data: { ...data, isActive: true } },
      {
        onSuccess: () => {
          toast({ title: 'Annonce créée' });
          announcementForm.reset();
          queryClient.invalidateQueries({ queryKey: getGetAdminAnnouncementsQueryKey() });
        },
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  const toggleAnnouncement = (id: number, isActive: boolean, title: string, message: string) => {
    updateAnnouncementMutation.mutate(
      { id, data: { title, message, isActive: !isActive } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminAnnouncementsQueryKey() }),
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  const deleteAnnouncement = (id: number) => {
    deleteAnnouncementMutation.mutate(
      { id },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminAnnouncementsQueryKey() }),
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  const gainsActive = form.watch('gainsActive');

  return (
    <AdminLayout title="Paramètres">
      <div className="space-y-6">
        {/* Platform settings */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Paramètres de la plateforme</h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSettingsSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="dailyRatePercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taux journalier (%)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="maxCapital" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capital max (FCFA)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="minDeposit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dépôt min (FCFA)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="minWithdrawal" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retrait min (FCFA)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="withdrawalFeePercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frais retrait (%)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Gains toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground">Gains actifs</p>
                    <p className="text-xs text-muted-foreground">Activer/désactiver l'accumulation des gains</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => form.setValue('gainsActive', !gainsActive)}
                    className={`p-1 rounded-xl transition-colors ${gainsActive ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {gainsActive
                      ? <ToggleRight className="w-8 h-8" />
                      : <ToggleLeft className="w-8 h-8" />
                    }
                  </button>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold text-foreground mb-3">Commissions de parrainage</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField control={form.control} name="level1Percent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Niveau 1 (%)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="level2Percent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Niveau 2 (%)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="level3Percent" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Niveau 3 (%)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11" disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                </Button>
              </form>
            </Form>
          )}
        </div>

        {/* Payment integration settings */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Intégration de paiement</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Ces clés sont stockées de façon sécurisée en base de données. Laissez un champ vide pour conserver la valeur actuelle.
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">

                {/* Sendavapay SDK Key */}
                <FormField control={paymentForm.control} name="sendavapayKey" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Clé SDK Sendavapay
                      {settings?.sendavapayKeySet && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-normal">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Configurée
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <SecretInput
                        placeholder={settings?.sendavapayKeySet ? '••••••••••••• (laisser vide pour conserver)' : 'Entrez votre clé SDK Sendavapay'}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={paymentForm.control} name="ashtechpayKey" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Clé API AshtechPay
                      {settings?.ashtechpayKeySet && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-normal">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Configurée
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <SecretInput
                        placeholder={settings?.ashtechpayKeySet ? '••••••••••••• (laisser vide pour conserver)' : 'Entrez votre clé API AshtechPay'}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={paymentForm.control} name="activeDepositProvider" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fournisseur Mobile Money actif</FormLabel>
                    <FormControl>
                      <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="sendavapay">SendavaPay</option>
                        <option value="ashtechpay">AshtechPay</option>
                      </select>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Le changement s’applique aux nouveaux dépôts Mobile Money.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Sendavapay Webhook Secret */}
                <FormField control={paymentForm.control} name="sendavapayWebhookSecret" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Secret Webhook Sendavapay
                      {settings?.sendavapayWebhookSecretSet && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-normal">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Configuré
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <SecretInput
                        placeholder={settings?.sendavapayWebhookSecretSet ? '••••••••••••• (laisser vide pour conserver)' : 'Entrez le secret webhook Sendavapay'}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Utilisé pour vérifier les signatures HMAC des webhooks de confirmation de dépôt.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* USDT Address */}
                <FormField control={paymentForm.control} name="usdtAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse USDT BEP20</FormLabel>
                    <FormControl>
                      <Input placeholder="0x..." {...field} className="font-mono text-xs" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Adresse affichée aux utilisateurs pour les dépôts en USDT.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full h-11" disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending ? 'Enregistrement...' : 'Enregistrer les paramètres de paiement'}
                </Button>
              </form>
            </Form>
          )}
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Communautés</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Configurez les liens qui seront affichés aux utilisateurs dans leur espace Compte et le support.
          </p>
          <Form {...socialForm}>
            <form onSubmit={socialForm.handleSubmit(onSocialSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={socialForm.control} name="telegramGroupUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><UsersRound className="w-4 h-4 text-[#229ED9]" /> Groupe Telegram</FormLabel>
                    <FormControl><Input placeholder="https://t.me/..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={socialForm.control} name="telegramChannelUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Send className="w-4 h-4 text-[#229ED9]" /> Chaîne Telegram</FormLabel>
                    <FormControl><Input placeholder="https://t.me/..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={socialForm.control} name="whatsappGroupUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><UsersRound className="w-4 h-4 text-[#25D366]" /> Groupe WhatsApp</FormLabel>
                    <FormControl><Input placeholder="https://chat.whatsapp.com/..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={socialForm.control} name="whatsappChannelUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-[#25D366]" /> Chaîne WhatsApp</FormLabel>
                    <FormControl><Input placeholder="https://whatsapp.com/channel/..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={socialForm.control} name="whatsappSupportUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-[#25D366]" /> Service client WhatsApp</FormLabel>
                    <FormControl><Input placeholder="https://wa.me/..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full h-11" disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? 'Enregistrement...' : 'Enregistrer les liens sociaux'}
              </Button>
            </form>
          </Form>
        </div>

        {/* Announcements */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Annonces</h2>
          </div>

          <Form {...announcementForm}>
            <form onSubmit={announcementForm.handleSubmit(onAnnouncementCreate)} className="space-y-3 mb-5">
              <FormField control={announcementForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl><Input placeholder="Titre de l'annonce" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={announcementForm.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Contenu de l'annonce..."
                      rows={3}
                      className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createAnnouncementMutation.isPending}>
                {createAnnouncementMutation.isPending ? '...' : "Publier l'annonce"}
              </Button>
            </form>
          </Form>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className={`rounded-xl p-4 border ${ann.isActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm text-foreground">{ann.title}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleAnnouncement(ann.id, ann.isActive, ann.title, ann.message)}
                      className={`p-1 rounded ${ann.isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {ann.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(ann.id)}
                      className="p-1 rounded text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{ann.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
