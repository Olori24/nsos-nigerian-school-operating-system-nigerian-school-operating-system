import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Eye, GraduationCap, Loader2, MapPin, Phone, School } from "lucide-react";
import { useMemo } from "react";
import { useRoute } from "wouter";

type SiteQuery = { data?: PublicSchoolSite; isLoading: boolean };
type PublicSchoolSite = {
  school: { name: string; shortCode?: string; state?: string | null };
  website: { headline?: string | null; introduction?: string | null; primaryColor?: string | null; campusLocation?: string | null; contactPhone?: string | null; contactEmail?: string | null; logoUrl?: string | null; heroUrl?: string | null; visualTheme?: "modern" | "academic" | "community" | null };
  admissionsUrl?: string | null;
};
type WebsitePreviewInput = { headline?: string; introduction?: string; primaryColor?: string; campusLocation?: string; contactPhone?: string; contactEmail?: string; logoUrl?: string | null; heroUrl?: string | null; visualTheme?: "modern" | "academic" | "community" | null };
export type WebsitePreviewSection = "brand" | "hero" | "contact" | "location" | "admissions";

export default function SchoolWebsite() {
  const [, params] = useRoute("/school/:shortCode");
  const shortCode = useMemo(() => params?.shortCode?.toUpperCase() ?? "", [params?.shortCode]);
  const site = trpc.nsos.website.publicSite.useQuery({ shortCode }, { enabled: !!shortCode });
  return <SchoolWebsitePage site={site} />;
}

export function SchoolWebsitePage({ site }: { site: SiteQuery }) {
  if (site.isLoading) return <main className="grid min-h-screen place-items-center bg-[#f5f6f1]"><Loader2 className="h-6 w-6 animate-spin text-[#0f5c4f]" /></main>;
  if (!site.data) return <main className="grid min-h-screen place-items-center bg-[#f5f6f1] p-5"><section className="max-w-md rounded-3xl border border-[#e0e5df] bg-white p-8 text-center shadow-sm"><School className="mx-auto h-7 w-7 text-[#0f5c4f]" /><h1 className="mt-4 text-xl font-semibold text-[#20342c]">School website unavailable</h1><p className="mt-2 text-sm leading-6 text-[#758079]">This school website is not published, the domain is not active, or the link is not recognised.</p></section></main>;
  return <SchoolWebsiteLayout site={site.data} />;
}

export function SchoolWebsitePreview({ school, website, admissionsEnabled, highlightedSection }: { school: { name: string; shortCode?: string; state?: string | null }; website: WebsitePreviewInput; admissionsEnabled: boolean; highlightedSection?: WebsitePreviewSection | null }) {
  const site: PublicSchoolSite = { school, website, admissionsUrl: admissionsEnabled ? `/apply/${school.shortCode ?? "school"}` : null };
  return <SchoolWebsiteLayout site={site} preview highlightedSection={highlightedSection} />;
}

export function SchoolWebsiteLayout({ site, preview = false, highlightedSection }: { site: PublicSchoolSite; preview?: boolean; highlightedSection?: WebsitePreviewSection | null }) {
  const { school, website, admissionsUrl } = site;
  const brand = website.primaryColor || "#0f5c4f";
  const visualTheme = website.visualTheme ?? "modern";
  const theme = visualTheme === "academic"
    ? { shell: "bg-[#f7f5ef]", header: "border-b border-[#ded8c7] bg-[#fffdf7]/90", glow: "bg-[radial-gradient(circle_at_80%_0%,#e8dfc5_0%,transparent_36%)]" }
    : visualTheme === "community"
      ? { shell: "bg-[#faf5ee]", header: "border-b border-[#eadbc8] bg-[#fffaf4]/90", glow: "bg-[radial-gradient(circle_at_85%_5%,#f3d2aa_0%,transparent_38%)]" }
      : { shell: "bg-[#f5f7f4]", header: "border-b border-[#dce7df] bg-white/90", glow: "bg-[radial-gradient(circle_at_78%_0%,#d9eee5_0%,transparent_38%)]" };
  const previewOutline = (section: WebsitePreviewSection) =>
    preview && highlightedSection === section
      ? "rounded-2xl ring-2 ring-[#e1a62d] ring-offset-4 ring-offset-[#f5f7f4] shadow-[0_0_0_5px_rgba(225,166,45,.14)]"
      : "";
  const admissionAction = admissionsUrl
    ? preview
      ? <span className="inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/10" style={{ backgroundColor: brand }}>Apply now <ArrowUpRight className="h-4 w-4" /></span>
      : <a className="inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5" style={{ backgroundColor: brand }} href={admissionsUrl}>Apply now <ArrowUpRight className="h-4 w-4" /></a>
    : null;

  return <main className={`school-public-site min-h-full overflow-hidden text-[#15201c] ${theme.shell}`} data-visual-theme={visualTheme}>
    {preview && <div className="flex items-center justify-center gap-2 border-b border-[#d9e6dc] bg-[#edf6ef] px-4 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#276144]"><Eye className="h-3.5 w-3.5" />Live draft preview — not yet public</div>}

    <header className={`sticky top-0 z-20 backdrop-blur-xl ${theme.header}`}>
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8 ${previewOutline("brand")}`} data-preview-section="brand">
        <a href="#top" className="flex min-w-0 items-center gap-3">
          {website.logoUrl
            ? <img src={website.logoUrl} alt={`${school.name} logo`} className="h-11 w-11 rounded-2xl border border-black/5 bg-white object-contain p-1.5 shadow-sm" />
            : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ backgroundColor: brand }}><GraduationCap className="h-5 w-5" /></span>}
          <div className="min-w-0"><p className="truncate text-sm font-bold tracking-[-.01em]">{school.name}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#758079]">{school.state ?? "Nigeria"}</p></div>
        </a>
        <nav className="hidden items-center gap-6 text-xs font-semibold text-[#5d6b64] md:flex" aria-label="School website">
          <a href="#about" className="transition hover:text-[#15201c]">About</a>
          <a href="#admissions" className="transition hover:text-[#15201c]">Admissions</a>
          <a href="#contact" className="transition hover:text-[#15201c]">Contact</a>
        </nav>
        {admissionAction}
      </div>
    </header>

    <section id="top" className={`relative isolate ${theme.glow} ${previewOutline("hero")}`} data-preview-section="hero">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] shadow-sm" style={{ color: brand }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brand }} />
            {visualTheme === "academic" ? "Education with purpose" : visualTheme === "community" ? "Together, we grow" : "Welcome to our school"}
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[.94] tracking-[-.065em] text-[#14251e] sm:text-6xl lg:text-[5.25rem]">
            {website.headline || `${school.name}: learning for a brighter future.`}
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-[#617069] sm:text-lg">
            {website.introduction || "A school community focused on meaningful learning, confident young people, and a thoughtful foundation for the future."}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {admissionAction}
            <a href="#about" className="rounded-full border border-[#d8e2dc] bg-white/80 px-5 py-2.5 text-sm font-bold text-[#31463d] shadow-sm transition hover:-translate-y-0.5">Explore the school</a>
          </div>
        </div>
        <div className="relative">
          {website.heroUrl && <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white p-2 shadow-[0_30px_80px_rgba(22,68,46,.16)]"><img src={website.heroUrl} alt="School-provided website hero" className="aspect-[4/3] w-full rounded-[1.5rem] object-cover" /></div>}
          {!website.heroUrl && <div className="relative min-h-[340px] overflow-hidden rounded-[2rem] border border-white/80 bg-white p-3 shadow-[0_30px_80px_rgba(22,68,46,.12)]">
            <div className="absolute inset-3 rounded-[1.5rem]" style={{ background: `linear-gradient(145deg, ${brand} 0%, #173a30 55%, #0b211b 100%)` }} />
            <div className="relative flex min-h-[340px] flex-col justify-end rounded-[1.5rem] p-8 text-white">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur"><GraduationCap className="h-6 w-6" /></span>
              <p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-white/55">The school community</p>
              <p className="mt-2 max-w-md text-3xl font-semibold tracking-[-.04em]">A digital front door for families, learners and the wider community.</p>
            </div>
          </div>}
        </div>
      </div>
    </section>

    <section id="about" className="border-y border-[#e0e7e1] bg-white/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-7 sm:grid-cols-3 sm:px-8">
        <Info icon={School} label="School" value={school.name} />
        <Info icon={MapPin} label="Campus" value={website.campusLocation || school.state || "Nigeria"} highlighted={previewOutline("location")} section="location" />
        <Info icon={Phone} label="Connect" value={website.contactPhone || website.contactEmail || "Contact the school office"} highlighted={previewOutline("contact")} section="contact" />
      </div>
    </section>

    <section id="admissions" className={`mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 ${previewOutline("admissions")}`} data-preview-section="admissions">
      <div className="grid overflow-hidden rounded-[2rem] bg-[#132c24] text-white shadow-[0_30px_80px_rgba(17,45,36,.16)] lg:grid-cols-[1fr_.8fr]">
        <div className="p-8 sm:p-12 lg:p-16">
          <p className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: brand === "#0f5c4f" ? "#8bd2ba" : brand }}>Admissions</p>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-.055em] sm:text-5xl">A clear route from enquiry to enrolment.</h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/65">Families can discover the school, review its public information and use the secure NSOS admissions route when applications are open.</p>
          <div className="mt-8">{admissionAction || <span className="text-sm font-semibold text-white/50">Admissions are currently closed.</span>}</div>
        </div>
        <div className="border-t border-white/10 bg-white/[.03] p-8 sm:p-12 lg:border-l lg:border-t-0">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Why this matters</p>
          <div className="mt-6 space-y-5">
            <Feature title="Clear information" text="Give families the essentials before they need to call the office." />
            <Feature title="Secure applications" text="Move admissions into the protected NSOS workflow instead of exposing sensitive records." />
            <Feature title="School-owned identity" text="Keep the public experience branded around the institution, not the software underneath it." />
          </div>
        </div>
      </div>
    </section>

    <section id="contact" className="border-t border-[#e0e7e1] bg-[#f8faf7]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: brand }}>Visit or contact us</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-[#1c3028]">Start a conversation with {school.name}.</h2></div>
        <div className="grid gap-3 text-sm text-[#536159] sm:grid-cols-2">
          {website.campusLocation && <span className="rounded-2xl border border-[#dce7df] bg-white px-4 py-3">{website.campusLocation}</span>}
          {website.contactPhone && <a href={`tel:${website.contactPhone}`} className="rounded-2xl border border-[#dce7df] bg-white px-4 py-3 font-semibold">{website.contactPhone}</a>}
          {website.contactEmail && <a href={`mailto:${website.contactEmail}`} className="rounded-2xl border border-[#dce7df] bg-white px-4 py-3 font-semibold">{website.contactEmail}</a>}
        </div>
      </div>
    </section>

    <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-10 text-xs text-[#758079] sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <span>Powered by NSOS · Nigerian School Operating System</span>
      <span>{school.name}</span>
    </footer>
  </main>;
}

function Feature({ title, text }: { title: string; text: string }) {
  return <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-white/55">{text}</p></div>;
}

function Info({ icon: Icon, label, value, highlighted = "", section }: { icon: typeof School; label: string; value: string; highlighted?: string; section?: WebsitePreviewSection }) { return <div className={`rounded-xl border border-[#e0e5df] bg-white p-4 ${highlighted}`} data-preview-section={section}><Icon className="h-4 w-4 text-[#0f5c4f]" /><p className="mt-4 text-[10px] font-bold uppercase tracking-[.13em] text-[#7a847e]">{label}</p><p className="mt-1 text-sm font-semibold text-[#31463d]">{value}</p></div>; }
