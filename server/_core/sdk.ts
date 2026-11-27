import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type AuthenticatedUser = User & {
  sessionId?: string;
};

type SessionClaims = {
  openId: string;
  name: string;
  sessionId?: string;
  expiresAt: Date;
};

class SessionService {
  private getSessionSecret() {
    if (ENV.cookieSecret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string; sessionId?: string } = {},
  ): Promise<string> {
    if (!openId || openId.length > 320) throw new Error("A valid NSOS account identifier is required.");
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const payload = {
      openId,
      name: options.name?.trim().slice(0, 255) || "NSOS user",
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
    };
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000))
      .sign(this.getSessionSecret());
  }

  async verifySession(token: string | undefined | null): Promise<SessionClaims | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.getSessionSecret(), { algorithms: ["HS256"] });
      if (typeof payload.openId !== "string" || !payload.openId || typeof payload.exp !== "number") return null;
      return {
        openId: payload.openId,
        name: typeof payload.name === "string" ? payload.name : "NSOS user",
        sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
        expiresAt: new Date(payload.exp * 1000),
      };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    let token = cookies[COOKIE_NAME];
    if (!token && typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7);
    }
    const session = await this.verifySession(token);
    if (!session) throw ForbiddenError("Invalid or expired NSOS session.");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("NSOS account not found.");

    const sessionId = session.sessionId ?? db.legacySessionId(token ?? "");
    const active = await db.ensureActiveUserSession({
      userId: user.id,
      sessionId,
      source: user.loginMethod ?? "legacy",
      userAgent: req.get("user-agent") ?? undefined,
      expiresAt: session.expiresAt,
    });
    if (!active) throw ForbiddenError("This NSOS session has been revoked.");

    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    return { ...user, sessionId };
  }
}

export const sdk = new SessionService();
