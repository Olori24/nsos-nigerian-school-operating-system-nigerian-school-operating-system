import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BiodataThemeToggle } from "./components/BiodataThemeToggle";
import {
  BiodataDocumentAutofill,
  type BiodataAutofillProposal,
} from "./components/BiodataDocumentAutofill";
import { InstallNSOSPrompt } from "./components/InstallNSOSPrompt";
import { NSOSUpdatePrompt } from "./components/NSOSUpdatePrompt";
import { DeveloperArsenalLaunch } from "./components/DeveloperArsenalLaunch";
import { useEffect, useState } from "react";
import { clearPageStructuredData, setCanonicalUrl, setPageMetadata } from "./lib/seo";
import Home from "./pages/Home";
import EcosystemHome from "./pages/EcosystemHome";
import PublicAdmissions from "./pages/PublicAdmissions";
import SchoolWebsite from "./pages/SchoolWebsite";
import DomainSchoolWebsite from "./pages/DomainSchoolWebsite";
import LeadCapture from "./pages/LeadCapture";

function useNoIndexMetadata() {
  useEffect(() => {
    const robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousContent = robotsMeta?.content;
    const meta = robotsMeta ?? document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    if (!robotsMeta) document.head.appendChild(meta);

    return () => {
      if (robotsMeta && previousContent !== undefined) {
        robotsMeta.content = previousContent;
      } else {
        meta.remove();
      }
    };
  }, []);
}

function NoIndexHome() {
  useNoIndexMetadata();
  return <Home />;
}

function NoIndexLeadCapture() {
  useNoIndexMetadata();
  return <LeadCapture />;
}

function isNsosPlatformHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "nsos.top" ||
    hostname === "www.nsos.top" ||
    hostname.endsWith(".manus.space") ||
    hostname.endsWith(".manus.computer")
  );
}

function RouteMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    const canonicalUrl = new URL(location, window.location.origin);
    canonicalUrl.search = "";
    canonicalUrl.hash = "";
    setCanonicalUrl(canonicalUrl.toString());
    clearPageStructuredData();
    setPageMetadata({
      title: "NSOS | School Management Software for Nigerian Schools",
      description:
        "NSOS is a school management platform for Nigerian schools, bringing school administration, academic operations and communication into one connected workspace.",
    });
  }, [location]);

  return null;
}

function Router() {
  if (
    typeof window !== "undefined" &&
    !isNsosPlatformHost(window.location.hostname)
  )
    return <DomainSchoolWebsite />;
  return (
    <Switch>
      <Route path="/" component={EcosystemHome} />
      <Route path="/app" component={NoIndexHome} />
      <Route path="/start" component={NoIndexLeadCapture} />
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
    const onTarget = (event: Event) =>
      setTarget(
        (event as CustomEvent<{ target: InternalAutofillTarget | null }>).detail
          ?.target ?? null
      );
    window.addEventListener("nsos:biodata-autofill-target", onTarget);
    return () =>
      window.removeEventListener("nsos:biodata-autofill-target", onTarget);
  }, []);
  if (!target) return null;
  const allowedKeys = (
    target === "admission"
      ? [
          "firstName",
          "lastName",
          "guardianName",
          "guardianPhone",
          "guardianEmail",
          "stateOfOrigin",
          "localGovernmentOfOrigin",
        ]
      : ["firstName", "lastName", "stateOfOrigin", "localGovernmentOfOrigin"]
  ) as Array<keyof BiodataAutofillProposal>;
  return (
    <div className="fixed bottom-5 left-5 z-[70] w-[min(28rem,calc(100vw-2.5rem))] shadow-[0_16px_40px_rgba(14,39,29,0.18)]">
      <BiodataDocumentAutofill
        allowedKeys={allowedKeys}
        onApply={values =>
          window.dispatchEvent(
            new CustomEvent("nsos:biodata-autofill-apply", {
              detail: { target, values },
            })
          )
        }
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <RouteMetadata />
          <Router />
          {import.meta.env.DEV && <DeveloperArsenalLaunch />}
          <InternalBiodataAutofillLauncher />
          <InstallNSOSPrompt />
          <NSOSUpdatePrompt />
          <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 sm:bottom-5 sm:right-5 sm:z-[70]">
            <BiodataThemeToggle />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
