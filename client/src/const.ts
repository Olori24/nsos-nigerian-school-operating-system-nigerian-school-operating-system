export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Start the native NSOS Google OAuth flow. */
export const startLogin = () => {
  window.location.assign("/api/auth/google/start");
};
