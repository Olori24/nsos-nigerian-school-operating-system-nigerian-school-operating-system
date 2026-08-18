import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { SchoolWebsitePage } from "./SchoolWebsite";

export default function DomainSchoolWebsite() {
  const domain = window.location.hostname;
  const site = trpc.nsos.website.publicDomain.useQuery({ domain }, { enabled: !!domain });
  useEffect(() => { document.title = site.data?.school.name ? `${site.data.school.name} | NSOS` : "NSOS School Website"; }, [site.data]);
  return <SchoolWebsitePage site={site} />;
}
