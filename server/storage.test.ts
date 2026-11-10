import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send(...args: unknown[]) {
      return mocks.send(...args);
    }
  },
  PutObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mocks.getSignedUrl,
}));

vi.mock("./_core/env", () => ({
  ENV: {
    storageProvider: "s3",
    s3Endpoint: "https://account.r2.cloudflarestorage.com",
    s3Region: "auto",
    s3Bucket: "nsos-test",
    s3AccessKeyId: "test-access-key",
    s3SecretAccessKey: "test-secret-key",
    s3ForcePathStyle: true,
    isProduction: true,
    forgeApiUrl: "",
    forgeApiKey: "",
  },
}));

import { storageGet, storageGetSignedUrl, storagePut } from "./storage";

describe("standalone S3-compatible object storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue({});
    mocks.getSignedUrl.mockResolvedValue("https://signed.example/object");
  });

  it("uploads bytes with the original school-scoped key and content type", async () => {
    const result = await storagePut(
      "schools/34/knowledge-library/source/handbook.pdf",
      Buffer.from("test-file"),
      "application/pdf",
    );

    expect(result.key).toMatch(/^schools\/34\/knowledge-library\/source\/handbook_[a-f0-9]{8}\.pdf$/);
    expect(result.url).toBe(`/manus-storage/${result.key}`);
    const command = mocks.send.mock.calls[0]?.[0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      Bucket: "nsos-test",
      Key: result.key,
      ContentType: "application/pdf",
    });
    expect(command.input.Body).toEqual(Buffer.from("test-file"));
  });

  it("creates short-lived signed download URLs for the requested object key", async () => {
    const url = await storageGetSignedUrl("schools/34/admissions/51/passport.pdf");

    expect(url).toBe("https://signed.example/object");
    expect(mocks.getSignedUrl).toHaveBeenCalledTimes(1);
    expect(mocks.getSignedUrl.mock.calls[0]?.[2]).toEqual({ expiresIn: 300 });
  });

  it("preserves the established proxy URL and rejects traversal keys", async () => {
    await expect(storageGet("schools/34/knowledge-library/../private.txt")).rejects.toThrow("Storage object key is invalid.");
    expect(await storageGet("schools/34/knowledge-library/handbook.pdf")).toEqual({
      key: "schools/34/knowledge-library/handbook.pdf",
      url: "/manus-storage/schools/34/knowledge-library/handbook.pdf",
    });
  });
});
