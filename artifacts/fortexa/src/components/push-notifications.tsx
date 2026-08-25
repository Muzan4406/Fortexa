import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

function apiUrl(path: string) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${base}/api${path}`;
}

let activeSync: Promise<void> | null = null;

export function PushNotifications({ showControl = true }: { showControl?: boolean }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<"unsupported" | "blocked" | "off" | "on" | "error" | "loading">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission === "denied" ? "blocked" : "off");
    if (Notification.permission === "granted") {
      void syncSubscription().catch((error) => {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Impossible de synchroniser les notifications");
      });
    }
  }, [token]);

  async function syncSubscription() {
    if (activeSync) return activeSync;
    activeSync = syncSubscriptionOnce().finally(() => {
      activeSync = null;
    });
    return activeSync;
  }

  async function syncSubscriptionOnce() {
    if (!token || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.register(`${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/push-sw.js`);
    await registration.update();
    const response = await fetch(apiUrl("/push/vapid-public-key"));
    if (!response.ok) {
      throw new Error(`Impossible de récupérer la clé push (${response.status})`);
    }
    const { publicKey } = await response.json();
    if (!publicKey) {
      throw new Error("Le service de notifications push n'est pas configuré sur le serveur");
    }
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const existingSubscription = await registration.pushManager.getSubscription();
    // Recreate the subscription so browsers do not keep using an old VAPID key
    // after a deployment or a key rotation.
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    const subscribeResponse = await fetch(apiUrl("/push/subscribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!subscribeResponse.ok) {
      throw new Error(`Impossible d'enregistrer l'abonnement (${subscribeResponse.status})`);
    }
    setStatus("on");
    setErrorMessage("");
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'activer les notifications";
      setStatus("error");
      setErrorMessage(message);
      toast({ title: "Activation impossible", description: message, variant: "destructive" });
    }
  }

  async function resync() {
    try {
      setStatus("loading");
      await syncSubscription();
      toast({ title: "Abonnement resynchronisé", description: "Ce téléphone est maintenant enregistré pour les notifications." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de resynchroniser les notifications";
      setStatus("error");
      setErrorMessage(message);
      toast({ title: "Resynchronisation impossible", description: message, variant: "destructive" });
    }
  }

  async function testPush() {
    if (!token) return;
    try {
      setTesting(true);
      const response = await fetch(apiUrl("/push/test"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const report = await response.json();
      if (!response.ok) throw new Error(report?.error || `Test impossible (${response.status})`);
      toast({
        title: report.sent > 0 ? "Test push envoyé" : "Aucun abonnement actif",
        description: `Envoyée(s) : ${report.sent} · Échec(s) : ${report.failed} · Supprimée(s) : ${report.removed}`,
        variant: report.sent > 0 ? "default" : "destructive",
      });
    } catch (error) {
      toast({ title: "Test push impossible", description: error instanceof Error ? error.message : "Erreur serveur", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  if (status === "loading" || status === "unsupported") return null;
  if (!showControl) return null;
  if (status === "on") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications push activées</p>
            <p className="text-xs text-muted-foreground">Commissions, filleuls et annonces vous seront signalés.</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={testPush} disabled={testing} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
            {testing ? "Test…" : "Tester maintenant"}
          </button>
          <button onClick={resync} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800">
            Resynchroniser
          </button>
        </div>
      </div>
    );
  }
  return <button onClick={enable} disabled={status === "blocked"} className="flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left disabled:opacity-60"><BellOff className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold text-foreground">{status === "blocked" ? "Notifications bloquées par le navigateur" : status === "error" ? "Réessayer les notifications" : "Activer les notifications push"}</p><p className="text-xs text-muted-foreground">{status === "blocked" ? "Autorisez-les dans les réglages du navigateur." : status === "error" ? errorMessage : "Soyez averti de vos commissions, filleuls et annonces."}</p></div></button>;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}