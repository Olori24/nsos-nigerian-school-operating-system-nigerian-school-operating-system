const DEFAULT_SOCIAL_IMAGE = "https://nsos.top/icons/nsos-icon-512.png";

type PageMetadata = {
  title: string;
  description: string;
  imageUrl?: string | null;
};

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return DEFAULT_SOCIAL_IMAGE;
  try {
    const resolved = new URL(imageUrl, window.location.origin);
    return resolved.protocol === "http:" || resolved.protocol === "https:"
      ? resolved.toString()
      : DEFAULT_SOCIAL_IMAGE;
  } catch {
    return DEFAULT_SOCIAL_IMAGE;
  }
}

export function setCanonicalUrl(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
  upsertMeta("property", "og:url", url);
}

export function setPageMetadata({ title, description, imageUrl }: PageMetadata) {
  const safeDescription = description.trim().replace(/\s+/g, " ").slice(0, 160);
  const image = resolveImageUrl(imageUrl);
  document.title = title;
  upsertMeta("name", "description", safeDescription);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", safeDescription);
  upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", safeDescription);
  upsertMeta("name", "twitter:image", image);
}

export function setPageStructuredData(data: Record<string, unknown>) {
  let script = document.getElementById("nsos-page-structured-data") as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = "nsos-page-structured-data";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function clearPageStructuredData() {
  document.getElementById("nsos-page-structured-data")?.remove();
}
