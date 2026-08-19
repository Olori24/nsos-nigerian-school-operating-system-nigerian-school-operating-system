export const GOOGLE_SIGNIN_NOTICE_COOKIE = "__Host-google_signin_notice";

export function hasGoogleSignInNotice(cookie: string | undefined) {
  if (!cookie) return false;
  return cookie.split(";").map(part => part.trim()).some(part => part === `${GOOGLE_SIGNIN_NOTICE_COOKIE}=google_success`);
}

export function clearGoogleSignInNotice() {
  return `${GOOGLE_SIGNIN_NOTICE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}
