const NSOS_VERCEL_PREVIEW_HOST = "nsos-vercel-migration";

export function isNsosPlatformHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");

  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "nsos.top" ||
    normalizedHostname === "www.nsos.top" ||
    normalizedHostname.endsWith(".manus.space") ||
    normalizedHostname.endsWith(".manus.computer") ||
    normalizedHostname === `${NSOS_VERCEL_PREVIEW_HOST}.vercel.app` ||
    (normalizedHostname.startsWith(`${NSOS_VERCEL_PREVIEW_HOST}-`) &&
      normalizedHostname.endsWith(".vercel.app"))
  );
}
