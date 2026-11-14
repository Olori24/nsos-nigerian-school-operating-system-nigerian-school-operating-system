import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  env: {
    s3Bucket: "nsos-test",
    s3AccessKeyId: "test-access",
    s3SecretAccessKey: "test-secret",
    s3Region: "auto",
    s3Endpoint: "",
    legacyForgeApiUrl: "https://forge.example",
    legacyForgeApiKey: "legacy-read-key",
  },
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class { send = mocks.send; },
  GetObjectCommand: class { constructor(public input: unknown) {} },
  HeadObjectCommand: class { constructor(public input: unknown) {} },
  PutObjectCommand: class { constructor(public input: unknown) {} },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: vi.fn() }));
vi.mock("./_core/env", () => ({ ENV: mocks.env }));

import { storageGetObject } from "./storage";

describe("legacy storage read compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mocks.env, { s3Bucket: "nsos-test", s3AccessKeyId: "test-access", s3SecretAccessKey: "test-secret", s3Region: "auto", s3Endpoint: "", legacyForgeApiUrl: "https://forge.example", legacyForgeApiKey: "legacy-read-key" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads a pre-migration object from Forge when the destination bucket has no copy", async () => {
    mocks.send.mockRejectedValueOnce(Object.assign(new Error("missing"), {
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        url: "https://nsos-bucket.s3.amazonaws.com/schools/34/website-media/logo.png?signature=test",
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response("legacy-file-content", {
        status: 200,
        headers: { "content-type": "image/png", "content-length": "19" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const object = await storageGetObject("schools/34/website-media/logo.png");
    const chunks: Buffer[] = [];
    for await (const chunk of object.Body as NodeJS.ReadableStream) chunks.push(Buffer.from(chunk));

    expect(Buffer.concat(chunks).toString()).toBe("legacy-file-content");
    expect(object.ContentType).toBe("image/png");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("v1/storage/presign/get");
  });

  it("can read legacy objects while destination S3 credentials are not configured", async () => {
    mocks.env.s3Bucket = "";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        url: "https://nsos-bucket.s3.amazonaws.com/schools/34/admissions/51/passport.png?signature=test",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response("legacy-passport", { status: 200, headers: { "content-type": "image/png" } }));
    vi.stubGlobal("fetch", fetchMock);

    const object = await storageGetObject("schools/34/admissions/51/passport.png");

    expect(object.ContentType).toBe("image/png");
    expect(mocks.send).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not fall back to legacy storage for destination authorization or service errors", async () => {
    mocks.send.mockRejectedValueOnce(Object.assign(new Error("denied"), {
      name: "AccessDenied",
      $metadata: { httpStatusCode: 403 },
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(storageGetObject("schools/34/website-media/logo.png")).rejects.toThrow("denied");
    expect(fetchMock).not.toHaveBeenCalled();
  });


  it("accepts the official Tigris S3-compatible endpoint", async () => {
    mocks.env.s3Endpoint = "https://t3.storage.dev";
    mocks.send.mockResolvedValueOnce({ Body: null, ContentType: "application/octet-stream" });

    await expect(storageGetObject("schools/34/website-media/logo.png"))
      .resolves.toMatchObject({ ContentType: "application/octet-stream" });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it("rejects a legacy provider response that points to an untrusted host", async () => {
    mocks.send.mockRejectedValueOnce(Object.assign(new Error("missing"), {
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      url: "https://169.254.169.254/latest/meta-data/",
    }), { status: 200 })));

    await expect(storageGetObject("schools/34/website-media/logo.png")).rejects.toThrow("untrusted download URL");
  });
});
