import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type Props = { onToken: (token: string) => void };

export function TurnstileWidget({ onToken }: Props) {
  const buildSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const [siteKey, setSiteKey] = useState<string | null>(buildSiteKey || null);
  const [configurationError, setConfigurationError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const apiBase = import.meta.env.BASE_URL.replace(/\/+$/, '');
    fetch(`${apiBase}/api/config/public`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Configuration indisponible"))))
      .then((config: { turnstileSiteKey?: string | null }) => {
        if (active && config.turnstileSiteKey) setSiteKey(config.turnstileSiteKey);
        if (active && !config.turnstileSiteKey && !buildSiteKey) setConfigurationError(true);
      })
      .catch(() => {
        if (active && !buildSiteKey) setConfigurationError(true);
      });
    return () => {
      active = false;
    };
  }, [buildSiteKey]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    const renderWidget = () => {
      if (window.turnstile && containerRef.current) {
        window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      }
    };
    if (window.turnstile) {
      renderWidget();
      return;
    }
    const existing = document.querySelector('script[data-fortexa-turnstile]');
    if (existing) {
      existing.addEventListener("load", renderWidget);
      return () => existing.removeEventListener("load", renderWidget);
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.fortexaTurnstile = "true";
    script.addEventListener("load", renderWidget);
    document.head.appendChild(script);
    return () => script.removeEventListener("load", renderWidget);
  }, [siteKey, onToken]);

  if (!siteKey) {
    return configurationError ? (
      <p className="text-sm text-destructive">Vérification Cloudflare indisponible. Réessayez plus tard.</p>
    ) : null;
  }
  return <div ref={containerRef} className="min-h-[65px]" aria-label="Vérification de sécurité" />;
}