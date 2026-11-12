import { trpc } from "@/lib/trpc";
import { SchoolWebsitePage } from "./SchoolWebsite";

export default function DomainSchoolWebsite() {
  const domain = window.location.hostname;
  const site = trpc.nsos.website.publicDomain.useQuery({ domain }, { enabled: !!domain });
  return <SchoolWebsitePage site={site} />;
}
