import express, { type Express, type Request, type Response } from "express";
import * as db from "./db";

function schoolIdFromRequest(req: Request) {
  const queryValue = Array.isArray(req.query.schoolId) ? req.query.schoolId[0] : req.query.schoolId;
  if (typeof queryValue !== "string" || !/^\d+$/.test(queryValue)) return undefined;
  const schoolId = Number(queryValue);
  return Number.isSafeInteger(schoolId) && schoolId > 0 ? schoolId : undefined;
}

function canonicalRequestUrl(req: Request) {
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || req.protocol || "https";
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${protocol}://${host}${req.originalUrl}`;
}

function asSingleValueFields(payload: unknown) {
  return Object.fromEntries(
    Object.entries((payload ?? {}) as Record<string, unknown>)
      .filter(([, value]) => typeof value === "string" || Array.isArray(value))
      .map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : String(value)]),
  ) as Record<string, string | string[]>;
}

async function acceptDeliveryEvent(input: { schoolId: number; providerMessageId: string; deliveryState: db.SmsDeliveryState; res: Response }) {
  await db.updateProviderSmsDeliveryStatus({ schoolId: input.schoolId, providerMessageId: input.providerMessageId, deliveryState: input.deliveryState });
  input.res.status(200).end();
}

async function termiiDeliveryWebhook(req: Request, res: Response) {
  const schoolId = schoolIdFromRequest(req);
  const rawPayload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  if (!schoolId || !rawPayload) return res.status(400).end();
  const webhookSecret = await db.getSmsWebhookVerificationSecret(schoolId, "termii");
  if (!webhookSecret || !db.verifyTermiiWebhookSignature(rawPayload, req.get("x-termii-signature") ?? undefined, webhookSecret)) return res.status(403).end();
  try {
    const payload = JSON.parse(rawPayload) as { message_id?: unknown; status?: unknown };
    const providerMessageId = typeof payload.message_id === "string" ? payload.message_id : "";
    if (!providerMessageId) return res.status(200).end();
    return await acceptDeliveryEvent({ schoolId, providerMessageId, deliveryState: db.mapTermiiSmsDeliveryStatus(typeof payload.status === "string" ? payload.status : undefined), res });
  } catch {
    return res.status(400).end();
  }
}

async function twilioDeliveryWebhook(req: Request, res: Response) {
  const schoolId = schoolIdFromRequest(req);
  if (!schoolId) return res.status(400).end();
  const authToken = await db.getSmsWebhookVerificationSecret(schoolId, "twilio");
  const formFields = asSingleValueFields(req.body);
  if (!authToken || !db.verifyTwilioWebhookSignature({ callbackUrl: canonicalRequestUrl(req), formFields, signature: req.get("x-twilio-signature") ?? undefined, authToken })) return res.status(403).end();
  const providerMessageId = typeof formFields.MessageSid === "string" ? formFields.MessageSid : "";
  if (!providerMessageId) return res.status(200).end();
  return acceptDeliveryEvent({ schoolId, providerMessageId, deliveryState: db.mapTwilioSmsDeliveryStatus(typeof formFields.MessageStatus === "string" ? formFields.MessageStatus : undefined), res });
}

export function registerSmsWebhookRoutes(app: Express) {
  app.post("/api/webhooks/sms/termii", express.raw({ type: "application/json", limit: "1mb" }), (req, res) => { void termiiDeliveryWebhook(req, res).catch(() => res.status(500).end()); });
  app.post("/api/webhooks/sms/twilio", express.urlencoded({ extended: false, limit: "1mb" }), (req, res) => { void twilioDeliveryWebhook(req, res).catch(() => res.status(500).end()); });
}
