import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import {
  useGetAdminUsers, useSuspendUser, useBanUser, useUpdateAdminUser,
  useAdjustUserFunds,
  getGetAdminUsersQueryKey,
  FundsAdjustmentType, FundsAdjustmentWalletType,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/format';
import { Search, UserCheck, UserX, Ban, DollarSign } from 'lucide-react';

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustWallet, setAdjustWallet] = useState<'investment' | 'gains'>('investment');

  const { data: result, isLoading } = useGetAdminUsers({ search: search || undefined });
  const users = result?.items ?? [];

  const suspendMutation = useSuspendUser();
  const banMutation = useBanUser();
  const reactivateMutation = useUpdateAdminUser();
  const adjustFundsMutation = useAdjustUserFunds();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });

  const handleSuspend = (id: number) => {
    suspendMutation.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: 'Utilisateur suspendu' }); invalidate(); },
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  const handleBan = (id: number) => {
    banMutation.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: 'Utilisateur banni' }); invalidate(); },
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  const handleReactivate = (id: number) => {
    reactivateMutation.mutate(
      { id, data: {} },
      {
        onSuccess: () => { toast({ title: 'Utilisateur réactivé' }); invalidate(); },
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  const handleAdjust = () => {
    if (!selectedUser || !adjustAmount) return;
    adjustFundsMutation.mutate(
      {
        id: selectedUser.id,
        data: {
          amount: parseFloat(adjustAmount),
          type: adjustType === 'add' ? FundsAdjustmentType.add : FundsAdjustmentType.subtract,
          walletType: adjustWallet === 'investment' ? FundsAdjustmentWalletType.investment : FundsAdjustmentWalletType.gains,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Fonds ajustés' });
          setSelectedUser(null);
          setAdjustAmount('');
          invalidate();
        },
        onError: (err: any) => toast({ title: 'Erreur', description: err.data?.error, variant: 'destructive' }),
      }
    );
  };

  const STATUS_BADGE: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-amber-100 text-amber-700',
    banned: 'bg-red-100 text-red-700',
  };
  const STATUS_LABEL: Record<string, string> = {
    active: 'Actif',
    suspended: 'Suspendu',
    banned: 'Banni',
  };

  return (
    <AdminLayout title="Utilisateurs">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Adjust funds modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-1">Ajuster les fonds</h3>
            <p className="text-sm text-muted-foreground mb-4">{selectedUser.name}</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setAdjustWallet('investment')} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${adjustWallet === 'investment' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Capital</button>
                <button onClick={() => setAdjustWallet('gains')} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${adjustWallet === 'gains' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Gains</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAdjustType('add')} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${adjustType === 'add' ? 'border-green-500 bg-green-50 text-green-700' : 'border-border'}`}>Ajouter</button>
                <button onClick={() => setAdjustType('subtract')} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${adjustType === 'subtract' ? 'border-red-500 bg-red-50 text-red-700' : 'border-border'}`}>Retirer</button>
              </div>
              <Input
                type="number"
                placeholder="Montant (FCFA)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="h-11"
              />
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedUser(null)}>Annuler</Button>
                <Button className="flex-1" onClick={handleAdjust} disabled={adjustFundsMutation.isPending}>
                  {adjustFundsMutation.isPending ? '...' : 'Confirmer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-card rounded-xl border animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[user.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[user.status] ?? user.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Capital</p>
                  <p className="font-bold">{formatCurrency(user.investmentBalance)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Gains</p>
                  <p className="font-bold">{formatCurrency(user.gainBalance)}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setSelectedUser(user); setAdjustAmount(''); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Ajuster
                </button>
                {user.status !== 'active' && (
                  <button
                    onClick={() => handleReactivate(user.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Réactiver
                  </button>
                )}
                {user.status === 'active' && (
                  <button
                    onClick={() => handleSuspend(user.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg font-medium"
                  >
                    <UserX className="w-3.5 h-3.5" /> Suspendre
                  </button>
                )}
                {user.status !== 'banned' && (
                  <button
                    onClick={() => handleBan(user.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg font-medium"
                  >
                    <Ban className="w-3.5 h-3.5" /> Bannir
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Aucun utilisateur trouvé</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
