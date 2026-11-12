export function isStaticOnlyPreview(input: {
  vercel?: string;
  vercelEnv?: string;
  databaseUrl?: string;
}) {
  return input.vercel === "1" && input.vercelEnv === "preview" && !input.databaseUrl?.trim();
}
