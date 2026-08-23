import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'fortexa_pwa_dismissed';

export function PWAInstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if user already dismissed or app is already installed
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      // Show banner after a short delay so the user is settled in
      setTimeout(() => setVisible(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setPromptEvent(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-0 animate-in slide-in-from-bottom duration-400"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="w-full max-w-sm mx-auto rounded-2xl p-4 flex items-center gap-3 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #071a14 100%)',
          border: '1px solid rgba(52,211,153,0.25)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.1)',
          pointerEvents: 'auto',
        }}
      >
        {/* Logo */}
        <div
          className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <img src="/logo.jpg" alt="Fortexa" className="w-10 h-10 rounded-lg object-cover" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">Installer Fortexa</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(52,211,153,0.7)' }}>
            Accès rapide depuis votre écran d'accueil
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs transition-all"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#fff',
              boxShadow: '0 0 16px rgba(16,185,129,0.3)',
              opacity: installing ? 0.7 : 1,
            }}
          >
            {installing ? (
              <Smartphone className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {installing ? '…' : 'Installer'}
          </button>
        </div>
      </div>
    </div>
  );
}
