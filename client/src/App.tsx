import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BiodataThemeToggle } from "./components/BiodataThemeToggle";
import { BiodataDocumentAutofill, type BiodataAutofillProposal } from "./components/BiodataDocumentAutofill";
import { InstallNSOSPrompt } from "./components/InstallNSOSPrompt";
import { NSOSUpdatePrompt } from "./components/NSOSUpdatePrompt";
import { useEffect, useState } from "react";
import { useAuth } from "./_core/hooks/useAuth";
import Home from "./pages/Home";
import PublicAdmissions from "./pages/PublicAdmissions";
import SchoolWebsite from "./pages/SchoolWebsite";
import DomainSchoolWebsite from "./pages/DomainSchoolWebsite";
import { AffiliatePilotConsole } from "./components/AffiliatePilotConsole";
import { isNsosPlatformHost } from "./lib/platformHost";
import { trpc } from "./lib/trpc";

function AffiliatePilotRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const ownerAccess = trpc.nsos.platform.ownerAccess.useQuery(undefined, { enabled: Boolean(user) });

  useEffect(() => {
    if (!loading && !user) setLocation("/");
  }, [loading, setLocation, user]);

  if (loading || !user || ownerAccess.isLoading) return <div className="grid min-h-screen place-items-center bg-[#f5f6f1] p-6 text-sm text-[#627168]">Checking protected platform access…</div>;
  if (!ownerAccess.data?.isPlatformOwner) return <main className="grid min-h-screen place-items-center bg-[#f5f6f1] p-6"><section className="max-w-md rounded-2xl border border-[#e0e5df] bg-white p-6 text-center shadow-sm"><p className="text-sm font-semibold text-[#263e33]">Platform owner access required</p><p className="mt-2 text-sm leading-6 text-[#68736d]">This internal workspace is available only to the configured NSOS platform owner.</p><button type="button" onClick={() => setLocation("/")} className="mt-5 rounded-lg bg-[#0f5c4f] px-4 py-2 text-sm font-semibold text-white">Return to dashboard</button></section></main>;
  return <AffiliatePilotConsole open onClose={() => setLocation("/")} />;
}

function Router() {
  if (typeof window !== "undefined" && !isNsosPlatformHost(window.location.hostname)) return <DomainSchoolWebsite />;
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/apply/:shortCode" component={PublicAdmissions} />
      <Route path="/school/:shortCode" component={SchoolWebsite} />
      <Route path="/platform/affiliate-pilot" component={AffiliatePilotRoute} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

type InternalAutofillTarget = "admission" | "student";

function InternalBiodataAutofillLauncher() {
  const [target, setTarget] = useState<InternalAutofillTarget | null>(null);
  useEffect(() => {
    const onTarget = (event: Event) => setTarget((event as CustomEvent<{ target: InternalAutofillTarget | null }>).detail?.target ?? null);
    window.addEventListener("nsos:biodata-autofill-target", onTarget);
    return () => window.removeEventListener("nsos:biodata-autofill-target", onTarget);
  }, []);
  if (!target) return null;
  const allowedKeys = (target === "admission" ? ["firstName", "lastName", "guardianName", "guardianPhone", "guardianEmail", "stateOfOrigin", "localGovernmentOfOrigin"] : ["firstName", "lastName", "stateOfOrigin", "localGovernmentOfOrigin"]) as Array<keyof BiodataAutofillProposal>;
  return <div className="fixed bottom-5 left-5 z-[70] w-[min(28rem,calc(100vw-2.5rem))] shadow-[0_16px_40px_rgba(14,39,29,0.18)]"><BiodataDocumentAutofill allowedKeys={allowedKeys} onApply={values => window.dispatchEvent(new CustomEvent("nsos:biodata-autofill-apply", { detail: { target, values } }))} /></div>;
}

function EntryOverlayLayer() {
  const { user } = useAuth();
  const isPublicEntry = typeof window !== "undefined" && isNsosPlatformHost(window.location.hostname) && window.location.pathname === "/";

  if (isPublicEntry && !user) return null;

  return <>
    <InstallNSOSPrompt />
    <NSOSUpdatePrompt />
    <div className="fixed bottom-5 right-5 z-[70]"><BiodataThemeToggle /></div>
  </>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
          <InternalBiodataAutofillLauncher />
          <EntryOverlayLayer />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
