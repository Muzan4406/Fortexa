import { useEffect } from 'react';
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
import { Settings, Bell, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

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

const announcementSchema = z.object({
  title: z.string().min(2, 'Titre requis'),
  message: z.string().min(5, 'Message requis'),
});

type SettingsForm = z.infer<typeof settingsSchema>;
type AnnouncementForm = z.infer<typeof announcementSchema>;

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
    }
  }, [settings, form]);

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
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
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
