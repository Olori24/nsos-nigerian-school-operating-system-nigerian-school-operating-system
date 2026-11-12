import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { setCanonicalUrl } from "@/lib/seo";
import { SchoolWebsitePage } from "./SchoolWebsite";

export default function DomainSchoolWebsite() {
  const domain = window.location.hostname;

  useEffect(() => {
    const canonicalUrl = new URL(window.location.pathname, window.location.origin);
    canonicalUrl.search = "";
    canonicalUrl.hash = "";
    setCanonicalUrl(canonicalUrl.toString());
  }, []);

  const site = trpc.nsos.website.publicDomain.useQuery({ domain }, { enabled: !!domain });
  return <SchoolWebsitePage site={site} />;
}
