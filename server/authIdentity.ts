/**
 * Selects the account that may be recovered after a provider has independently
 * verified control of the same email address.
 *
 * Callers must query at most two exact-email matches. Ambiguous addresses fail
 * closed rather than risking a cross-account or cross-tenant attachment.
 */
export function requireUnambiguousVerifiedEmailAccount<T>(matches: T[]): T | undefined {
  if (matches.length > 1) {
    throw new Error("This email matches multiple NSOS accounts. Account recovery requires administrator assistance.");
  }
  return matches[0];
}
