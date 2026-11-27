import type { Express } from "express";
import * as db from "../db";
import { can, isManagementRole, type SchoolRole } from "../roles";
import { sdk } from "./sdk";
import { storageGetObject } from "../storage";
import { createRateLimitMiddleware } from "../security";

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
  app.get("/api/storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || !isSafeStorageKey(key)) {
      res.status(404).send("File not found");
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

      const object = await storageGetObject(key);
      if (!object.Body) {
        res.status(404).send("File not found");
        return;
      }
      const contentType = (object.ContentType ?? "application/octet-stream").split(";", 1)[0]!.trim().toLowerCase();
      const safeInlineImageTypes = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);
      const canRenderInline = safeInlineImageTypes.has(contentType);
      res.set("Cache-Control", "private, no-store");
      res.set("X-Content-Type-Options", "nosniff");
      res.set("Content-Security-Policy", "default-src 'none'; sandbox");
      res.set("Content-Type", canRenderInline ? contentType : "application/octet-stream");
      if (!canRenderInline) res.set("Content-Disposition", "attachment");
      if (object.ContentLength !== undefined) res.set("Content-Length", String(object.ContentLength));
      const body = object.Body as NodeJS.ReadableStream;
      body.on("error", error => {
        console.error("[StorageProxy] stream failed:", error);
        if (!res.headersSent) res.status(502).end("Storage proxy error");
        else res.destroy(error);
      });
      body.pipe(res);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
