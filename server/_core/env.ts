export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  // Vercel Preview runs with NODE_ENV=production; enforce production-only
  // configuration only for actual Production deployments.
  isProduction: process.env.VERCEL === "1"
    ? process.env.VERCEL_ENV === "production"
    : process.env.NODE_ENV === "production",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "gemini-2.5-flash",
  s3Region: process.env.S3_REGION ?? "auto",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  mapsUserAgent: process.env.MAPS_USER_AGENT ?? "NSOS/1.0 (https://nsos.top)",
  cronSecret: process.env.CRON_SECRET ?? "",
  ownerNotificationEmail: process.env.OWNER_NOTIFICATION_EMAIL ?? "",
  authCanonicalOrigin: process.env.AUTH_CANONICAL_ORIGIN ?? "https://nsos.top",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  authEmailFrom: process.env.AUTH_EMAIL_FROM ?? "",
  composioApiKey: process.env.COMPOSIO_API_KEY ?? "",
  composioUserId: process.env.COMPOSIO_USER_ID ?? "",
  composioConnectedAccountId: process.env.COMPOSIO_CONNECTED_ACCOUNT_ID ?? "",
  composioToolVersion: process.env.COMPOSIO_TOOL_VERSION ?? "",
};
