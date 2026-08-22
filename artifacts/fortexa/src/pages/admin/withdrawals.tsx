import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import {
  useGetAdminWithdrawals, useUpdateAdminWithdrawal,
  getGetAdminWithdrawalsQueryKey,
  TransactionStatusUpdateStatus,
} from '@workspace/api-client-react';
import type { TransactionStatus } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/format';
import { CheckCircle, XCircle, Clock, Smartphone, Wallet } from 'lucide-react';

const STATUS_CONFIG: Record<TransactionStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
};

export default function AdminWithdrawalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('pending');
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: result, isLoading } = useGetAdminWithdrawals({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const withdrawals = result?.items ?? [];

  const updateMutation = useUpdateAdminWithdrawal();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalsQueryKey() });

  const handleApprove = (id: number) => {
    updateMutation.mutate(
      { id, data: { status: TransactionStatusUpdateStatus.approved } },
      {
        onSuccess: () => { toast({ title: 'Retrait approuvé' }); invalidate(); },
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  const handleReject = () => {
    if (!rejectId) return;
    updateMutation.mutate(
      { id: rejectId, data: { status: TransactionStatusUpdateStatus.rejected, rejectionReason: rejectReason || null } },
      {
        onSuccess: () => {
          toast({ title: 'Retrait rejeté — fonds remboursés' });
          setRejectId(null);
          setRejectReason('');
          invalidate();
        },
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  return (
    <AdminLayout title="Retraits">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'
            }`}
          >
            {s === 'all' ? 'Tous' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Reject modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Rejeter le retrait</h3>
            <p className="text-xs text-muted-foreground mb-3">Les fonds seront automatiquement remboursés.</p>
            <Input
              placeholder="Motif du rejet (optionnel)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectId(null)}>Annuler</Button>
              <Button variant="destructive" className="flex-1" onClick={handleReject} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? '...' : 'Rejeter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-card rounded-xl border animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((wd) => (
            <div key={wd.id} className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-foreground">{wd.userName}</p>
                  <p className="text-xs text-muted-foreground">{wd.userEmail}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(wd.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{formatCurrency(wd.amount)}</p>
                  <p className="text-xs text-muted-foreground">Net: {formatCurrency(wd.netAmount)}</p>
                  <p className="text-xs text-muted-foreground">Frais: {formatCurrency(wd.fee)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[wd.status as TransactionStatus].color}`}>
                    {STATUS_CONFIG[wd.status as TransactionStatus].label}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Informations complètes</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <p className="flex items-center gap-1"><span className="text-muted-foreground">Moyen :</span> {wd.depositMethod === 'mobile_money' ? <><Smartphone className="h-3 w-3 text-emerald-600" /><span className="font-semibold">Mobile Money</span></> : wd.depositMethod === 'usdt' ? <><Wallet className="h-3 w-3 text-amber-600" /><span className="font-semibold">USDT BEP20</span></> : <span className="font-semibold">Non renseigné</span>}</p>
                  <p><span className="text-muted-foreground">Pays :</span> <span className="font-semibold">{wd.payerCountry || wd.userCountry || 'Non renseigné'}</span></p>
                  {wd.payerPhone && <p className="col-span-2"><span className="text-muted-foreground">Numéro :</span> <span className="font-mono font-semibold">{wd.payerPhone}</span></p>}
                  {wd.txid && <p className="col-span-2 break-all"><span className="text-muted-foreground">TXID :</span> <span className="font-mono font-semibold">{wd.txid}</span></p>}
                  {wd.sendavapayRef && <p className="col-span-2 break-all"><span className="text-muted-foreground">Référence :</span> <span className="font-mono font-semibold">{wd.sendavapayRef}</span></p>}
                </div>
                {wd.description && <p className="break-all text-xs text-muted-foreground"><span className="font-semibold">Détail :</span> {wd.description}</p>}
              </div>
              {wd.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(wd.id)}
                    disabled={updateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" /> Approuver
                  </button>
                  <button
                    onClick={() => setRejectId(wd.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" /> Rejeter
                  </button>
                </div>
              )}
              {wd.status === 'rejected' && wd.rejectionReason && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg p-2">Motif: {wd.rejectionReason}</p>
              )}
            </div>
          ))}
          {withdrawals.length === 0 && (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun retrait trouvé</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
