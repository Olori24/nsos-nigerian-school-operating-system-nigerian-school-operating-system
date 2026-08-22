import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BiodataThemeToggle } from "./components/BiodataThemeToggle";
import { BiodataDocumentAutofill, type BiodataAutofillProposal } from "./components/BiodataDocumentAutofill";
import { InstallNSOSPrompt } from "./components/InstallNSOSPrompt";
import { NSOSUpdatePrompt } from "./components/NSOSUpdatePrompt";
import { useEffect, useState } from "react";
import Home from "./pages/Home";
import PublicAdmissions from "./pages/PublicAdmissions";
import SchoolWebsite from "./pages/SchoolWebsite";
import DomainSchoolWebsite from "./pages/DomainSchoolWebsite";

function isNsosPlatformHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".manus.space") || hostname.endsWith(".manus.computer");
}

function Router() {
  if (typeof window !== "undefined" && !isNsosPlatformHost(window.location.hostname)) return <DomainSchoolWebsite />;
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/apply/:shortCode" component={PublicAdmissions} />
      <Route path="/school/:shortCode" component={SchoolWebsite} />
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

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
          <InternalBiodataAutofillLauncher />
          <InstallNSOSPrompt />
          <NSOSUpdatePrompt />
          <div className="fixed bottom-5 right-5 z-[70]"><BiodataThemeToggle /></div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
