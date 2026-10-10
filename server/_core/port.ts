export function parseConfiguredPort(rawPort: string | undefined): number {
  const value = (rawPort ?? "3000").trim();
  const port = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port between 1 and 65535.");
  }
  return port;
}
