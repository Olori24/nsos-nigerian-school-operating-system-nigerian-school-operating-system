import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));

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
  getSignedUrl: vi.fn(),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    storageProvider: "dual",
    s3Endpoint: "https://account.r2.cloudflarestorage.com",
    s3Region: "auto",
    s3Bucket: "nsos-test",
    s3AccessKeyId: "test-access-key",
    s3SecretAccessKey: "test-secret-key",
    s3ForcePathStyle: true,
    isProduction: true,
    forgeApiUrl: "https://forge.example",
    forgeApiKey: "legacy-test-key",
  },
}));

import { storageGetSignedUrl, storagePut } from "./storage";

describe("dual-write object storage migration mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue({});
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: "https://upload.example/object" }),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: "https://legacy-signed.example/object" }),
        }),
    );
  });

  it("mirrors new objects to S3 and legacy storage while retaining the old read path", async () => {
    const result = await storagePut(
      "schools/34/admissions/51/passport.pdf",
      Buffer.from("migration-safe"),
      "application/pdf",
    );

    expect(result.key).toMatch(/^schools\/34\/admissions\/51\/passport_[a-f0-9]{8}\.pdf$/);
    expect(result.url).toBe("/manus-storage/" + result.key);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);

    await expect(storageGetSignedUrl(result.key)).resolves.toBe("https://legacy-signed.example/object");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
