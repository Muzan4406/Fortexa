import { useState, useEffect, useRef } from 'react';
import { useGetGainsSnapshot } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/format';
import { TrendingUp } from 'lucide-react';

export function GainsCounter() {
  const { data: snapshot, isLoading } = useGetGainsSnapshot();
  const [currentGains, setCurrentGains] = useState(0);
  const prevGainsRef = useRef(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (!snapshot) return;

    const interval = setInterval(() => {
      const secondsElapsed = (Date.now() - new Date(snapshot.snapshotTime).getTime()) / 1000;
      const perSecondRate = (snapshot.investmentBalance * snapshot.dailyRatePercent / 100) / 86400;
      const newGains = snapshot.gainBalance + (snapshot.gainsActive ? perSecondRate * secondsElapsed : 0);
      
      if (Math.abs(newGains - prevGainsRef.current) > 0.0001) {
        setIsFlipping(true);
        setTimeout(() => setIsFlipping(false), 300);
      }
      
      prevGainsRef.current = newGains;
      setCurrentGains(newGains);
    }, 1000);

    return () => clearInterval(interval);
  }, [snapshot]);

  if (isLoading || !snapshot) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-3" />
        <div className="h-8 bg-muted rounded w-32" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 shadow-lg border border-primary/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-primary animate-pulse-glow" />
          <p className="text-sm font-medium text-muted-foreground">Gains en temps réel</p>
        </div>
        
        <div className={`text-3xl font-bold text-foreground ${isFlipping ? 'animate-number-flip' : ''}`} data-testid="text-gains-live">
          {formatCurrency(currentGains, 4)}
        </div>
        
        {!snapshot.gainsActive && (
          <p className="text-xs text-amber-600 mt-2 font-medium">Gains actuellement pausés</p>
        )}
        
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Taux journalier: <span className="font-semibold text-primary">{snapshot.dailyRatePercent}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}
