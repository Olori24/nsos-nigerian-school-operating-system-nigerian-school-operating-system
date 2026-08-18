import { trpc } from "@/lib/trpc";
import { ArrowUpRight, GraduationCap, Loader2, MapPin, Phone, School } from "lucide-react";
import { useMemo } from "react";
import { useRoute } from "wouter";

type SiteQuery = { data?: any; isLoading: boolean };

export default function SchoolWebsite() {
  const [, params] = useRoute("/school/:shortCode");
  const shortCode = useMemo(() => params?.shortCode?.toUpperCase() ?? "", [params?.shortCode]);
  const site = trpc.nsos.website.publicSite.useQuery({ shortCode }, { enabled: !!shortCode });
  return <SchoolWebsitePage site={site} />;
}

export function SchoolWebsitePage({ site }: { site: SiteQuery }) {
  if (site.isLoading) return <main className="grid min-h-screen place-items-center bg-[#f5f6f1]"><Loader2 className="h-6 w-6 animate-spin text-[#0f5c4f]" /></main>;
  if (!site.data) return <main className="grid min-h-screen place-items-center bg-[#f5f6f1] p-5"><section className="max-w-md rounded-3xl border border-[#e0e5df] bg-white p-8 text-center shadow-sm"><School className="mx-auto h-7 w-7 text-[#0f5c4f]" /><h1 className="mt-4 text-xl font-semibold text-[#20342c]">School website unavailable</h1><p className="mt-2 text-sm leading-6 text-[#758079]">This school website is not published, the domain is not active, or the link is not recognised.</p></section></main>;
  const { school, website, admissionsUrl } = site.data;
  const brand = website.primaryColor || "#0f5c4f";
  return <main className="min-h-screen bg-[#f6f7f2] text-[#15201c]"><header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ backgroundColor: brand }}><GraduationCap className="h-5 w-5" /></span><div><p className="text-sm font-bold">{school.name}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#758079]">{school.state ?? "Nigeria"}</p></div></div>{admissionsUrl && <a className="rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: brand }} href={admissionsUrl}>Apply now <ArrowUpRight className="ml-1 inline h-4 w-4" /></a>}</header><section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20"><p className="text-xs font-bold uppercase tracking-[.18em]" style={{ color: brand }}>Welcome to our school</p><h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[.96] tracking-[-.06em] text-[#152b23] sm:text-7xl">{website.headline || `${school.name}: learning for a brighter future.`}</h1><p className="mt-7 max-w-2xl text-base leading-8 text-[#617069]">{website.introduction || "A school community focused on meaningful learning, confident young people, and a thoughtful foundation for the future."}</p><div className="mt-12 grid gap-4 sm:grid-cols-3"><Info icon={School} label="School" value={school.name} /><Info icon={MapPin} label="Location" value={website.campusLocation || school.state || "Nigeria"} /><Info icon={Phone} label="Contact" value={website.contactPhone || website.contactEmail || "Contact the school office"} /></div></section><section className="border-y border-[#e0e5df] bg-white"><div className="mx-auto grid max-w-6xl gap-6 px-5 py-12 sm:grid-cols-2 sm:px-8"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{ color: brand }}>Our admissions</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] text-[#1c3028]">A clear route from enquiry to enrolment.</h2></div><div className="text-sm leading-7 text-[#65736b]">The school manages applications through its secure NSOS admissions workspace. Families can apply online, provide the requested information, and receive updates directly from the school.</div></div></section><footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-[#758079] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>Powered by NSOS · Nigerian School Operating System</span><span>{school.name}</span></footer></main>;
}

function Info({ icon: Icon, label, value }: { icon: typeof School; label: string; value: string }) { return <div className="rounded-xl border border-[#e0e5df] bg-white p-4"><Icon className="h-4 w-4 text-[#0f5c4f]" /><p className="mt-4 text-[10px] font-bold uppercase tracking-[.13em] text-[#7a847e]">{label}</p><p className="mt-1 text-sm font-semibold text-[#31463d]">{value}</p></div>; }
