import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import {
  useGetAdminDeposits, useUpdateAdminDeposit,
  getGetAdminDepositsQueryKey,
  TransactionStatusUpdateStatus,
} from '@workspace/api-client-react';
import type { TransactionStatus } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/format';
import { CheckCircle, X, XCircle, Clock, Smartphone, Wallet } from 'lucide-react';

function proofUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '');
  if (normalizedPath.startsWith('/api/uploads/')) return `${basePath}${normalizedPath}`;
  if (!normalizedPath.startsWith('/uploads/')) return path;
  return `${basePath}/api${normalizedPath}`;
}

const STATUS_CONFIG: Record<TransactionStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
};

export default function AdminDepositsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('pending');
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const { data: result, isLoading } = useGetAdminDeposits({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const deposits = result?.items ?? [];

  const updateMutation = useUpdateAdminDeposit();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAdminDepositsQueryKey() });

  const handleApprove = (id: number) => {
    updateMutation.mutate(
      { id, data: { status: TransactionStatusUpdateStatus.approved } },
      {
        onSuccess: () => { toast({ title: 'Dépôt approuvé' }); invalidate(); },
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
          toast({ title: 'Dépôt rejeté' });
          setRejectId(null);
          setRejectReason('');
          invalidate();
        },
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  return (
    <AdminLayout title="Dépôts">
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
            <h3 className="font-bold text-lg mb-4">Rejeter le dépôt</h3>
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
          {deposits.map((dep) => (
            <div key={dep.id} className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-foreground">{dep.userName}</p>
                  <p className="text-xs text-muted-foreground">{dep.userEmail}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(dep.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{formatCurrency(dep.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(STATUS_CONFIG[dep.status as TransactionStatus] ?? STATUS_CONFIG.pending).color}`}>
                    {(STATUS_CONFIG[dep.status as TransactionStatus] ?? STATUS_CONFIG.pending).label}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Informations complètes</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <p><span className="text-muted-foreground">Méthode :</span> <span className="font-semibold">{dep.depositMethod === 'mobile_money' ? 'Mobile Money' : dep.depositMethod === 'usdt' ? 'USDT BEP20' : 'Manuel'}</span></p>
                  <p><span className="text-muted-foreground">Pays :</span> <span className="font-semibold">{dep.payerCountry || dep.userCountry || 'Non renseigné'}</span></p>
                  <p><span className="text-muted-foreground">Montant net :</span> <span className="font-semibold">{formatCurrency(dep.netAmount)}</span></p>
                  <p><span className="text-muted-foreground">Frais :</span> <span className="font-semibold">{formatCurrency(dep.fee)}</span></p>
                  {dep.payerPhone && <p className="col-span-2"><span className="text-muted-foreground">Numéro :</span> <span className="font-mono font-semibold">{dep.payerPhone}</span></p>}
                  {dep.sendavapayRef && <p className="col-span-2 break-all"><span className="text-muted-foreground">Référence :</span> <span className="font-mono font-semibold">{dep.sendavapayRef}</span></p>}
                  {dep.txid && <p className="col-span-2 break-all"><span className="text-muted-foreground">TXID :</span> <span className="font-mono font-semibold">{dep.txid}</span></p>}
                </div>
                {dep.screenshotPath && (
                  <button
                    type="button"
                    onClick={() => setProofPreview(proofUrl(dep.screenshotPath!))}
                    className="mt-2 block overflow-hidden rounded-xl border border-blue-100 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
                  >
                    <img
                      src={proofUrl(dep.screenshotPath)}
                      alt="Preuve de paiement"
                      className="h-28 w-full object-cover"
                    />
                    <span className="block px-3 py-2 text-xs font-semibold text-primary">Voir la preuve de paiement</span>
                  </button>
                )}
              </div>
              {dep.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(dep.id)}
                    disabled={updateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" /> Approuver
                  </button>
                  <button
                    onClick={() => setRejectId(dep.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" /> Rejeter
                  </button>
                </div>
              )}
              {dep.status === 'rejected' && dep.rejectionReason && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg p-2">Motif: {dep.rejectionReason}</p>
              )}
            </div>
      ))}
      {proofPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setProofPreview(null)}
        >
          <div className="relative max-h-[90vh] max-w-lg overflow-hidden rounded-2xl bg-white p-2 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setProofPreview(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/75 text-white"
              aria-label="Fermer la preuve"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={proofPreview} alt="Preuve de paiement agrandie" className="max-h-[84vh] max-w-full rounded-xl object-contain" />
          </div>
        </div>
      )}
          {deposits.length === 0 && (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun dépôt trouvé</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
