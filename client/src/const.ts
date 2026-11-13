export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Start the native NSOS Google OAuth flow. */
export const startLogin = () => {
  const origin = window.location.origin;
  window.location.assign("/api/auth/google/start?origin=" + encodeURIComponent(origin));
};
