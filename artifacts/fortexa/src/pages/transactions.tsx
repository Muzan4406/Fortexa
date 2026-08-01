import { useState } from 'react';
import { UserLayout } from '@/components/user-layout';
import { useGetTransactions } from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { FileText, ArrowDownCircle, ArrowUpCircle, Users, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { TransactionType } from '@workspace/api-client-react';

const TYPE_CONFIG: Record<TransactionType, { label: string; icon: any; color: string }> = {
  deposit: { label: 'Dépôt', icon: ArrowDownCircle, color: 'text-green-600' },
  withdrawal: { label: 'Retrait', icon: ArrowUpCircle, color: 'text-red-600' },
  commission: { label: 'Commission', icon: Users, color: 'text-blue-600' },
  gain: { label: 'Gain', icon: TrendingUp, color: 'text-primary' },
};

export default function TransactionsPage() {
  const [activeType, setActiveType] = useState<TransactionType | 'all'>('all');
  
  const { data: allTransactions, isLoading } = useGetTransactions(
    activeType === 'all' ? {} : { type: activeType }
  );

  return (
    <UserLayout>
      <div className="gradient-green py-8 px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Transactions</h1>
            <p className="text-white/80 text-sm">Historique complet</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <Tabs value={activeType} onValueChange={(v) => setActiveType(v as TransactionType | 'all')} className="w-full">
          <TabsList className="w-full grid grid-cols-5 mb-6">
            <TabsTrigger value="all" className="text-xs">Tout</TabsTrigger>
            <TabsTrigger value="deposit" className="text-xs">Dépôts</TabsTrigger>
            <TabsTrigger value="withdrawal" className="text-xs">Retraits</TabsTrigger>
            <TabsTrigger value="commission" className="text-xs">Commissions</TabsTrigger>
            <TabsTrigger value="gain" className="text-xs">Gains</TabsTrigger>
          </TabsList>

          <TabsContent value={activeType} className="mt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : allTransactions && allTransactions.items.length > 0 ? (
              <div className="space-y-3">
                {allTransactions.items.map(transaction => {
                  const typeInfo = TYPE_CONFIG[transaction.type];
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <div
                      key={transaction.id}
                      className="bg-card rounded-xl p-4 border border-border shadow-sm"
                      data-testid={`transaction-${transaction.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${typeInfo.color} bg-current/10 flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <h3 className="font-semibold text-foreground">{typeInfo.label}</h3>
                              <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${typeInfo.color}`}>
                                {transaction.type === 'withdrawal' ? '-' : '+'}{formatCurrency(transaction.amount)}
                              </p>
                              {transaction.fee > 0 && (
                                <p className="text-xs text-muted-foreground">Frais: {formatCurrency(transaction.fee)}</p>
                              )}
                            </div>
                          </div>
                          
                          {transaction.description && (
                            <p className="text-sm text-muted-foreground mt-1">{transaction.description}</p>
                          )}
                          
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              transaction.status === 'approved' ? 'bg-green-100 text-green-700' :
                              transaction.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {transaction.status === 'approved' ? 'Approuvé' :
                               transaction.status === 'pending' ? 'En attente' : 'Rejeté'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune transaction</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
}
