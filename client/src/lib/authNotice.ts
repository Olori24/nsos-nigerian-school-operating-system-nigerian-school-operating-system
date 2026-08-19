export const GOOGLE_SIGNIN_NOTICE_COOKIE = "__Host-google_signin_notice";
export const SUCCESS_TOAST_DURATION_MS = 5_000;
export const SUCCESS_TOAST_CLASS = "nsos-success-toast";
export const GOOGLE_SIGNIN_TOAST_DURATION_MS = SUCCESS_TOAST_DURATION_MS;
export const GOOGLE_SIGNIN_TOAST_CLASS = SUCCESS_TOAST_CLASS;

export function hasGoogleSignInNotice(cookie: string | undefined) {
  if (!cookie) return false;
  return cookie.split(";").map(part => part.trim()).some(part => part === `${GOOGLE_SIGNIN_NOTICE_COOKIE}=google_success`);
}

export function clearGoogleSignInNotice() {
  return `${GOOGLE_SIGNIN_NOTICE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}
