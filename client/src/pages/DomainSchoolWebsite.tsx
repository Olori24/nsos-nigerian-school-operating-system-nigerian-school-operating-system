import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { breadcrumbJsonLd, usePublicMetadata } from "@/lib/publicMetadata";
import { SchoolWebsitePage } from "./SchoolWebsite";

export default function DomainSchoolWebsite() {
  const domain = window.location.hostname;
  const site = trpc.nsos.website.publicDomain.useQuery(
    { domain },
    { enabled: !!domain }
  );
  const metadata = useMemo(() => {
    const name = site.data?.school.name;
    const canonicalUrl = window.location.origin + "/";
    return {
      title: name ? `${name} | NSOS` : "NSOS School Website",
      description: name
        ? site.data?.website.introduction ||
          `${name} public school website on NSOS.`
        : "This school website is not published, the domain is not active, or the link is not recognised.",
      canonicalUrl,
      robots: name ? "index, follow" : "noindex, nofollow",
      jsonLd: name
        ? [
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: `${name} | NSOS`,
              url: canonicalUrl,
              description:
                site.data?.website.introduction ||
                `${name} public school website on NSOS.`,
            },
            breadcrumbJsonLd([{ name, path: "/" }]),
          ]
        : undefined,
    };
  }, [site.data]);
  usePublicMetadata(metadata);
  return <SchoolWebsitePage site={site} />;
}
