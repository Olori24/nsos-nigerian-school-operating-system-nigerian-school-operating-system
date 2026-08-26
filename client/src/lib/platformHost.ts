const NSOS_PLATFORM_CUSTOM_DOMAINS = new Set(["nsos.top", "www.nsos.top"]);

export function isNsosPlatformHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || NSOS_PLATFORM_CUSTOM_DOMAINS.has(host) || host.endsWith(".manus.space") || host.endsWith(".manus.computer");
}
