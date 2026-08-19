import { describe, expect, it } from "vitest";
import { GOOGLE_SIGNIN_NOTICE_COOKIE, clearGoogleSignInNotice, hasGoogleSignInNotice } from "../client/src/lib/authNotice";

describe("Google sign-in notice", () => {
  it("recognises only the short-lived verified Google success marker", () => {
    expect(hasGoogleSignInNotice(`${GOOGLE_SIGNIN_NOTICE_COOKIE}=google_success; another=value`)).toBe(true);
    expect(hasGoogleSignInNotice(`${GOOGLE_SIGNIN_NOTICE_COOKIE}=other_value`)).toBe(false);
    expect(hasGoogleSignInNotice(undefined)).toBe(false);
  });

  it("clears the marker with a host-only secure cookie instruction", () => {
    expect(clearGoogleSignInNotice()).toBe(`${GOOGLE_SIGNIN_NOTICE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Secure`);
  });
});
