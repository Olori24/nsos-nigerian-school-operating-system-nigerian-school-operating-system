import type { Express } from "express";
import * as db from "../db";
import { can, isManagementRole, type SchoolRole } from "../roles";
import { ENV } from "./env";
import { sdk } from "./sdk";

export function isSafeStorageKey(key: string) {
  return key.length > 0 && key.length <= 1024 && /^[A-Za-z0-9._/-]+$/.test(key) && !key.includes("..") && /^schools\/[1-9]\d*\//.test(key);
}

function canReadStoredObject(record: db.StoredObjectAccessRecord, input: { userId: number; role: SchoolRole }) {
  if (record.scope === "public_website_media") return true;
  if (record.scope === "website_media" || record.scope === "knowledge_source") return isManagementRole(input.role);
  if (record.scope === "admission_document") return can(input.role, "students.read");
  if (record.scope === "curriculum_scheme") return can(input.role, "academics.read");
  return can(input.role, "finance.read") || (can(input.role, "portal.read") && record.createdBy === input.userId);
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || !isSafeStorageKey(key)) {
      res.status(404).send("File not found");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const record = await db.getStoredObjectAccessRecord(key);
      if (!record) {
        res.status(404).send("File not found");
        return;
      }

      if (record.scope !== "public_website_media") {
        let user;
        try {
          user = await sdk.authenticateRequest(req);
        } catch {
          res.status(404).send("File not found");
          return;
        }
        const membership = await db.getSchoolMembership(user.id, record.schoolId);
        if (!membership || membership.schoolId !== record.schoolId || membership.status !== "active" || !canReadStoredObject(record, { userId: user.id, role: membership.role as SchoolRole })) {
          res.status(404).send("File not found");
          return;
        }
      }

      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        console.error("[StorageProxy] forge signing failed", { status: forgeResp.status });
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
