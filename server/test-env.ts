const testEnv: Record<string, string> = {
  JWT_SECRET: "nsos-vitest-cookie-secret",
  DATABASE_URL: process.env.DATABASE_URL ?? "mysql://nsos:nsos_test_password@127.0.0.1:3306/nsos",
  OAUTH_SERVER_URL: "https://auth.test.local",
  GOOGLE_CLIENT_ID: "nsos-vitest-google-client-id",
  GOOGLE_CLIENT_SECRET: "nsos-vitest-google-client-secret",
  RESEND_API_KEY: "nsos-vitest-resend-api-key",
  AUTH_EMAIL_FROM: "NSOS <onboarding@resend.dev>",
  BUILT_IN_FORGE_API_URL: "https://forge.test.local",
  BUILT_IN_FORGE_API_KEY: "nsos-vitest-forge-api-key",
};

for (const [key, value] of Object.entries(testEnv)) {
  if (!process.env[key]) process.env[key] = value;
}
