const PLATFORM_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "nsos.top",
  "www.nsos.top",
  "staging.nsos.top",
]);

export function isNsosPlatformHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\\.$/, "");
  return PLATFORM_HOSTS.has(host) || host.endsWith(".vercel.app");
}
