import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

function apiUrl(path: string) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${base}/api${path}`;
}

export function PushNotifications() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<"unsupported" | "blocked" | "off" | "on" | "loading">("loading");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission === "denied" ? "blocked" : "off");
    if (Notification.permission === "granted") {
      void syncSubscription();
    }
  }, [token]);

  async function syncSubscription() {
    if (!token || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.register(`${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/push-sw.js`);
    const response = await fetch(apiUrl("/push/vapid-public-key"), { headers: { Authorization: `Bearer ${token}` } });
    const { publicKey } = await response.json();
    if (!publicKey) {
      setStatus("unsupported");
      return;
    }
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await fetch(apiUrl("/push/subscribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(subscription.toJSON()),
    });
    setStatus("on");
  }

  async function enable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      await syncSubscription();
      toast({ title: "Notifications activées", description: "Vous recevrez les nouvelles commissions et annonces." });
    } catch {
      toast({ title: "Activation impossible", description: "Vérifiez que le site est ouvert en HTTPS.", variant: "destructive" });
    }
  }

  if (status === "loading" || status === "unsupported") return null;
  if (status === "on") {
    return <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold text-foreground">Notifications push activées</p><p className="text-xs text-muted-foreground">Commissions, filleuls et annonces vous seront signalés.</p></div></div>;
  }
  return <button onClick={enable} disabled={status === "blocked"} className="flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left disabled:opacity-60"><BellOff className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold text-foreground">{status === "blocked" ? "Notifications bloquées par le navigateur" : "Activer les notifications push"}</p><p className="text-xs text-muted-foreground">{status === "blocked" ? "Autorisez-les dans les réglages du navigateur." : "Soyez averti de vos commissions, filleuls et annonces."}</p></div></button>;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}