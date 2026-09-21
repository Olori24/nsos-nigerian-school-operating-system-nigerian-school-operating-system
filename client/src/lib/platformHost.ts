const NSOS_PLATFORM_CUSTOM_DOMAINS = new Set(["nsos.top", "www.nsos.top"]);
const NSOS_PLATFORM_PUBLIC_ORIGIN = "https://nsos.top";

export function isNsosPublicDomain(hostname: string) {
  return NSOS_PLATFORM_CUSTOM_DOMAINS.has(hostname.toLowerCase());
}

export function isNsosPlatformHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    NSOS_PLATFORM_CUSTOM_DOMAINS.has(host) ||
    host.endsWith(".manus.space") ||
    host.endsWith(".manus.computer")
  );
}

export function nsosSchoolPublicUrl(shortCode: string) {
  return `${NSOS_PLATFORM_PUBLIC_ORIGIN}/school/${encodeURIComponent(shortCode)}`;
}
