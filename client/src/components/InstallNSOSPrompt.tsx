import { Download, MonitorDown, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

/** Shows only after the browser has offered an installable PWA prompt. */
export function InstallNSOSPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("nsos:pwa-install-dismissed") === "true");

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (!isStandalone() && !dismissed) setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [dismissed]);

  if (isInstalled || dismissed || !deferredPrompt) return null;

  const install = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem("nsos:pwa-install-dismissed", "true");
    setDismissed(true);
  };

  return <aside aria-label="Install NSOS" className="fixed bottom-5 left-5 z-[60] w-[min(23rem,calc(100vw-2.5rem))] rounded-2xl border border-[#c9ddd0] bg-white p-3 shadow-[0_18px_46px_rgba(11,38,29,0.2)]">
    <div className="flex gap-3">
      <img src="/manus-storage/nsos-app-icon_63fa3e89.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#17382d]">Keep NSOS within reach</p>
        <p className="mt-0.5 text-xs leading-5 text-[#68786f]">Install the school workspace for a focused, app-like experience.</p>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#77867e] transition hover:bg-[#eff5ef] hover:text-[#25483a]"><X className="h-4 w-4" /></button>
    </div>
    <button type="button" onClick={() => void install()} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0f5c4f] px-4 text-sm font-bold text-white transition hover:bg-[#0a4c41] active:scale-[0.97]"><Download className="h-4 w-4" />Install NSOS <MonitorDown className="h-3.5 w-3.5 opacity-70" /></button>
  </aside>;
}
