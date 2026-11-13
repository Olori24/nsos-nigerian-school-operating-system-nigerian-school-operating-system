const testEnv: Record<string, string> = {
  JWT_SECRET: "nsos-vitest-cookie-secret",
  DATABASE_URL: process.env.DATABASE_URL ?? "mysql://nsos:nsos_test_password@127.0.0.1:3306/nsos",
  GOOGLE_CLIENT_ID: "nsos-vitest-google-client-id",
  GOOGLE_CLIENT_SECRET: "nsos-vitest-google-client-secret",
  RESEND_API_KEY: "nsos-vitest-resend-api-key",
  AUTH_EMAIL_FROM: "NSOS <onboarding@resend.dev>",
  OWNER_NOTIFICATION_EMAIL: "owner@example.ng",
  GEMINI_API_KEY: "nsos-vitest-gemini-api-key",
  AI_MODEL: "gemini-2.5-flash",
  S3_BUCKET: "nsos-test-bucket",
  S3_ACCESS_KEY_ID: "nsos-test-access-key",
  S3_SECRET_ACCESS_KEY: "nsos-test-secret-key",
};

for (const [key, value] of Object.entries(testEnv)) {
  if (!process.env[key]) process.env[key] = value;
}
