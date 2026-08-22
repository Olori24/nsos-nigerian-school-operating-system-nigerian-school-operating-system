import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "nsos:pwa-update-dismissed";

export function NSOSUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let refreshing = false;
    const reloadForUpdate = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const inspectRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) setWaitingWorker(registration.waiting);
      const onUpdateFound = () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && registration.waiting && navigator.serviceWorker.controller) {
            setWaitingWorker(registration.waiting);
          }
        });
      };
      registration.addEventListener("updatefound", onUpdateFound);
      return () => registration.removeEventListener("updatefound", onUpdateFound);
    };

    let removeRegistrationListener: (() => void) | undefined;
    navigator.serviceWorker.addEventListener("controllerchange", reloadForUpdate);
    navigator.serviceWorker.getRegistration().then(registration => {
      if (!registration) return;
      removeRegistrationListener = inspectRegistration(registration);
      registration.update().catch(() => undefined);
    }).catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", reloadForUpdate);
      removeRegistrationListener?.();
    };
  }, []);

  if (!waitingWorker || dismissed) return null;

  const refresh = () => {
    waitingWorker.postMessage({ type: "NSOS_SKIP_WAITING" });
  };

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* Storage is optional. */ }
  };

  return <aside aria-label="NSOS update available" className="fixed bottom-24 left-5 z-[80] w-[min(23rem,calc(100vw-2.5rem))] rounded-2xl border border-[#b8d7cb] bg-white p-3 shadow-[0_18px_46px_rgba(11,38,29,0.24)] sm:bottom-5">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f5c4f] text-white"><RefreshCw className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#103a2e]">An NSOS update is ready</p>
        <p className="mt-0.5 text-xs leading-5 text-[#5d6d66]">Refresh to use the latest features, branding, and app assets.</p>
      </div>
      <button type="button" aria-label="Dismiss NSOS update" onClick={dismiss} className="-mr-1 -mt-1 rounded-lg p-1.5 text-[#718078] transition hover:bg-[#edf4ef] hover:text-[#174638] focus:outline-none focus:ring-2 focus:ring-[#0f5c4f] focus:ring-offset-2"><X className="h-4 w-4" aria-hidden="true" /></button>
    </div>
    <Button type="button" onClick={refresh} className="mt-3 h-10 w-full rounded-xl bg-[#0f6b59] text-sm font-semibold text-white hover:bg-[#0b5849]"><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Refresh NSOS</Button>
  </aside>;
}
