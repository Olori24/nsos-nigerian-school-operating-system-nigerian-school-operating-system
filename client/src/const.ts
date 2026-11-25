export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start the standalone NSOS Google sign-in flow. The server creates and
// validates the OAuth state cookie; the browser never handles provider secrets.
export const startLogin = () => {
  const origin = window.location.origin;
  const query = new URLSearchParams({ origin });
  window.location.assign("/api/auth/google/start?" + query.toString());
};
