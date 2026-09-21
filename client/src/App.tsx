import { Toaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BiodataThemeToggle } from "./components/BiodataThemeToggle";
import type { BiodataAutofillProposal } from "./components/BiodataDocumentAutofill";
import { InstallNSOSPrompt } from "./components/InstallNSOSPrompt";
import { NSOSUpdatePrompt } from "./components/NSOSUpdatePrompt";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "./_core/hooks/useAuth";
import { isNsosPlatformHost, isNsosPublicDomain } from "./lib/platformHost";

const Home = lazy(() => import("./pages/Home"));
const PublicLanding = lazy(() => import("./pages/PublicLanding"));
const PublicAdmissions = lazy(() => import("./pages/PublicAdmissions"));
const SchoolWebsite = lazy(() => import("./pages/SchoolWebsite"));
const DomainSchoolWebsite = lazy(() => import("./pages/DomainSchoolWebsite"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BiodataDocumentAutofill = lazy(() =>
  import("./components/BiodataDocumentAutofill").then(module => ({
    default: module.BiodataDocumentAutofill,
  }))
);

function RouteLoading() {
  return (
    <main
      aria-live="polite"
      className="grid min-h-screen place-items-center bg-[#f5f6f1] px-6 text-center text-[#294238]"
    >
      <div>
        <Spinner className="mx-auto size-5 text-[#0f5c4f]" />
        <p className="mt-3 text-sm font-semibold">Loading NSOS</p>
        <p className="mt-1 text-xs text-[#52675d]">
          Preparing the selected workspace securely.
        </p>
      </div>
    </main>
  );
}

function Router() {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";
  if (
    typeof window !== "undefined" &&
    isNsosPublicDomain(window.location.hostname)
  ) {
    const isMarketingPath = [
      "/",
      "/about",
      "/school-management-software",
      "/school-management-system-nigeria",
      "/for-schools",
      "/ai-for-schools",
      "/school-administration",
      "/student-management",
      "/academic-management",
      "/school-fees-management",
      "/school-attendance-management",
      "/school-results-management",
      "/parent-portal",
      "/school-communication",
      "/faq",
      "/contact",
    ].includes(pathname);
    if (isMarketingPath)
      return (
        <Suspense fallback={<RouteLoading />}>
          <PublicLanding />
        </Suspense>
      );
    if (
      pathname !== "/school/" &&
      pathname !== "/apply/" &&
      !pathname.startsWith("/school/") &&
      !pathname.startsWith("/apply/")
    )
      return (
        <Suspense fallback={<RouteLoading />}>
          <NotFound />
        </Suspense>
      );
  }
  if (
    typeof window !== "undefined" &&
    !isNsosPlatformHost(window.location.hostname)
  )
    return (
      <Suspense fallback={<RouteLoading />}>
        <DomainSchoolWebsite />
      </Suspense>
    );
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/apply/:shortCode" component={PublicAdmissions} />
        <Route path="/school/:shortCode" component={SchoolWebsite} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#d6e5da] bg-[#f7fbf7] p-4 text-sm font-semibold text-[#1d563d]"
          >
            Loading document autofill…
          </div>
        }
      >
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
      </Suspense>
    </div>
  );
}

function EntryOverlayLayer() {
  const { user } = useAuth();
  const isPublicEntry =
    typeof window !== "undefined" &&
    isNsosPublicDomain(window.location.hostname);

  if (isPublicEntry && !user) return null;

  return (
    <>
      <InstallNSOSPrompt />
      <NSOSUpdatePrompt />
      <div className="fixed bottom-5 right-5 z-[70]">
        <BiodataThemeToggle />
      </div>
    </>
  );
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
