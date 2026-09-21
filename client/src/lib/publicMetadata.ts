import { useEffect } from "react";

export const NSOS_PUBLIC_ORIGIN = "https://nsos.top";
export const NSOS_SOCIAL_IMAGE = `${NSOS_PUBLIC_ORIGIN}/icons/nsos-icon-512.png`;

export type PublicMetadata = {
  title: string;
  description: string;
  canonicalUrl?: string;
  robots?: string;
  imageUrl?: string;
  jsonLd?: unknown | unknown[];
};

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string
) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
  element.dataset.nsosManaged = "true";
}

function upsertCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = url;
  element.dataset.nsosManaged = "true";
}

function removeManagedJsonLd() {
  document.head
    .querySelectorAll(
      'script[type="application/ld+json"][data-nsos-managed="true"]'
    )
    .forEach(element => element.remove());
}

function addJsonLd(value: unknown) {
  const element = document.createElement("script");
  element.type = "application/ld+json";
  element.dataset.nsosManaged = "true";
  element.textContent = JSON.stringify(value);
  document.head.appendChild(element);
}

export function setPublicMetadata(metadata: PublicMetadata) {
  if (typeof document === "undefined") return;
  const canonicalUrl = metadata.canonicalUrl ?? NSOS_PUBLIC_ORIGIN;
  const imageUrl = metadata.imageUrl ?? NSOS_SOCIAL_IMAGE;
  document.title = metadata.title;
  upsertMeta("name", "description", metadata.description);
  upsertMeta(
    "name",
    "robots",
    metadata.robots ?? "index, follow, max-image-preview:large"
  );
  upsertCanonical(canonicalUrl);
  upsertMeta("property", "og:type", "website");
  upsertMeta(
    "property",
    "og:site_name",
    "NSOS — Nigerian School Operating System"
  );
  upsertMeta("property", "og:title", metadata.title);
  upsertMeta("property", "og:description", metadata.description);
  upsertMeta("property", "og:url", canonicalUrl);
  upsertMeta("property", "og:image", imageUrl);
  upsertMeta("property", "og:locale", "en_NG");
  upsertMeta("name", "twitter:card", "summary");
  upsertMeta("name", "twitter:title", metadata.title);
  upsertMeta("name", "twitter:description", metadata.description);
  upsertMeta("name", "twitter:image", imageUrl);
  removeManagedJsonLd();
  if (metadata.jsonLd) {
    const values = Array.isArray(metadata.jsonLd)
      ? metadata.jsonLd
      : [metadata.jsonLd];
    values.forEach(addJsonLd);
  }
}

export function usePublicMetadata(metadata: PublicMetadata) {
  useEffect(
    () => setPublicMetadata(metadata),
    [
      metadata.title,
      metadata.description,
      metadata.canonicalUrl,
      metadata.robots,
      metadata.imageUrl,
      metadata.jsonLd,
    ]
  );
}

export function absolutePublicUrl(path: string) {
  return `${NSOS_PUBLIC_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolutePublicUrl(item.path),
    })),
  };
}

export function nsosEntityJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "NSOS — Nigerian School Operating System",
      alternateName: "NSOS",
      url: NSOS_PUBLIC_ORIGIN,
      areaServed: { "@type": "Country", name: "Nigeria" },
      description:
        "A Nigeria-first school and learning-operations platform for school administration, academic operations, communication, finance, student management and supervised AI workflows.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "NSOS — Nigerian School Operating System",
      url: NSOS_PUBLIC_ORIGIN,
      inLanguage: "en-NG",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "NSOS — Nigerian School Operating System",
      alternateName: "NSOS",
      url: NSOS_PUBLIC_ORIGIN,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      areaServed: { "@type": "Country", name: "Nigeria" },
      description:
        "A Nigeria-first multi-tenant school and learning-operations platform for administration, learning workflows and supervised AI tools.",
      featureList: [
        "School administration",
        "Student management",
        "Academic and curriculum management",
        "Attendance management",
        "Results and report cards",
        "Fees and finance operations",
        "Staff operations",
        "Parent and guardian communication",
        "Supervised AI school workflows",
      ],
    },
  ];
}

export function serviceJsonLd(name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    serviceType: name,
    provider: {
      "@type": "Organization",
      name: "NSOS — Nigerian School Operating System",
      url: NSOS_PUBLIC_ORIGIN,
    },
    areaServed: { "@type": "Country", name: "Nigeria" },
    description,
  };
}

export function faqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
