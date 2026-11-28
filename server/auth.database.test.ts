import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, linkExternalAuthIdentity } from "./db";
import { authIdentities, users } from "../drizzle/schema";

const suffix = `auth-db-${process.pid}-${Date.now()}`;
const createdUserIds: number[] = [];
const createdIdentitySubjects: string[] = [];

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

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("MySQL test database is unavailable.");
  await db.execute({ sql: "SELECT 1", params: [] } as any);
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (createdIdentitySubjects.length) {
    await db.delete(authIdentities).where(inArray(authIdentities.providerSubject, createdIdentitySubjects));
  }
  if (createdUserIds.length) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
});

describe("external identity linking against MySQL 8.4", () => {
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
