import { afterAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { ensureActiveUserSession, getDb, linkExternalAuthIdentity, listActiveUserSessions, listUserSecurityActivity, resolveExternalAuthIdentity, revokeUserSession } from "./db";
import { authIdentities, userSecurityActivity, userSessions, users } from "../drizzle/schema";

const suffix = `auth-db-${process.pid}-${Date.now()}`;
const createdUserIds: number[] = [];
const createdIdentitySubjects: string[] = [];
const createdSessionIds: string[] = [];

async function createUser(label: string, email: string) {
  const db = await getDb();
  if (!db) throw new Error("MySQL test database is unavailable.");
  const openId = `${suffix}-${label}`;
  const result = await db.insert(users).values({
    openId,
    name: label,
    email,
    lastSignedIn: new Date(),
  });
  const id = Number(result[0].insertId);
  createdUserIds.push(id);
  return { id, email };
}


afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (createdIdentitySubjects.length) {
    await db.delete(authIdentities).where(inArray(authIdentities.providerSubject, createdIdentitySubjects));
  }
  if (createdSessionIds.length) {
    await db.delete(userSessions).where(inArray(userSessions.id, createdSessionIds));
  }
  if (createdUserIds.length) {
    await db.delete(userSecurityActivity).where(inArray(userSecurityActivity.userId, createdUserIds));
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
});

describe("external identity linking against MySQL 8.4", () => {
  it("does not create a second account when a verified provider email belongs to a legacy NSOS user", async () => {
    const legacy = await createUser("legacy-email-owner", `${suffix}-legacy@example.ng`);
    await expect(resolveExternalAuthIdentity({ provider: "google", providerSubject: `${suffix}-legacy-google`, email: legacy.email, name: "Duplicate Owner" })).rejects.toThrow("Existing NSOS accounts require explicit identity linking.");
    const db = await getDb();
    const matches = await db!.select().from(users).where(eq(users.email, legacy.email));
    expect(matches).toHaveLength(1);
    expect(matches[0]!.id).toBe(legacy.id);
  });

  it("rejects a verified provider email that differs from the NSOS account email", async () => {
    const owner = await createUser("mismatch-owner", `${suffix}-owner@example.ng`);
    const otherEmail = `${suffix}-other@example.ng`;

    await expect(linkExternalAuthIdentity({
      userId: owner.id,
      provider: "google",
      providerSubject: `${suffix}-google-mismatch`,
      email: otherEmail,
    })).rejects.toThrow("verified provider email must match");

    const db = await getDb();
    const rows = await db!.select().from(authIdentities).where(eq(authIdentities.userId, owner.id));
    expect(rows).toHaveLength(0);
  });

  it("rejects a Google identity already owned by a different NSOS account", async () => {
    const first = await createUser("duplicate-first", `${suffix}-first@example.ng`);
    const second = await createUser("duplicate-second", `${suffix}-second@example.ng`);
    const providerSubject = `${suffix}-google-duplicate`;
    createdIdentitySubjects.push(providerSubject);

    await linkExternalAuthIdentity({
      userId: first.id,
      provider: "google",
      providerSubject,
      email: first.email,
    });

    await expect(linkExternalAuthIdentity({
      userId: second.id,
      provider: "google",
      providerSubject,
      email: second.email,
    })).rejects.toThrow("already linked to another NSOS account");

    const db = await getDb();
    const rows = await db!.select().from(authIdentities).where(and(
      eq(authIdentities.provider, "google"),
      eq(authIdentities.providerSubject, providerSubject),
    ));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe(first.id);
  });

  it("is idempotent when the same provider identity is linked again to its owner", async () => {
    const owner = await createUser("same-owner", `${suffix}-same@example.ng`);
    const providerSubject = `${suffix}-google-same`;
    createdIdentitySubjects.push(providerSubject);

    await linkExternalAuthIdentity({
      userId: owner.id,
      provider: "google",
      providerSubject,
      email: owner.email,
    });
    await linkExternalAuthIdentity({
      userId: owner.id,
      provider: "google",
      providerSubject,
      email: owner.email.toUpperCase(),
    });

    const db = await getDb();
    const rows = await db!.select().from(authIdentities).where(and(
      eq(authIdentities.provider, "google"),
      eq(authIdentities.providerSubject, providerSubject),
    ));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe(owner.id);
    expect(rows[0]!.email).toBe(owner.email);
  });

  it("allows only one account to win concurrent claims for the same Google identity", async () => {
    const first = await createUser("race-first", `${suffix}-race-first@example.ng`);
    const second = await createUser("race-second", `${suffix}-race-second@example.ng`);
    const providerSubject = `${suffix}-google-race`;
    createdIdentitySubjects.push(providerSubject);

    const results = await Promise.allSettled([
      linkExternalAuthIdentity({ userId: first.id, provider: "google", providerSubject, email: first.email }),
      linkExternalAuthIdentity({ userId: second.id, provider: "google", providerSubject, email: second.email }),
    ]);

    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);

    const db = await getDb();
    const rows = await db!.select().from(authIdentities).where(and(
      eq(authIdentities.provider, "google"),
      eq(authIdentities.providerSubject, providerSubject),
    ));
    expect(rows).toHaveLength(1);
    expect([first.id, second.id]).toContain(rows[0]!.userId);
  });
});

describe("NSOS session ownership and revocation against MySQL 8.4", () => {
  it("allows only the owning user to revoke a session and rejects it on subsequent authentication", async () => {
    const owner = await createUser("session-owner", `${suffix}-session-owner@example.ng`);
    const attacker = await createUser("session-other", `${suffix}-session-other@example.ng`);
    const sessionId = `${suffix}-active-session`;
    createdSessionIds.push(sessionId);

    expect(await ensureActiveUserSession({
      userId: owner.id,
      sessionId,
      source: "test",
      userAgent: "NSOS authentication integration test",
      expiresAt: new Date(Date.now() + 60 * 60_000),
    })).toBe(true);

    expect(await revokeUserSession({ userId: attacker.id, sessionId, reason: "unauthorised attempt" })).toBe(false);
    expect((await listActiveUserSessions(owner.id)).map(session => session.id)).toContain(sessionId);

    expect(await revokeUserSession({ userId: owner.id, sessionId, reason: "owner initiated test revocation" })).toBe(true);
    expect((await listActiveUserSessions(owner.id)).map(session => session.id)).not.toContain(sessionId);
    expect(await ensureActiveUserSession({
      userId: owner.id,
      sessionId,
      source: "test",
      expiresAt: new Date(Date.now() + 60 * 60_000),
    })).toBe(false);

    const activity = await listUserSecurityActivity(owner.id);
    expect(activity.some(event => event.eventType === "session_revoked")).toBe(true);
  });
});
