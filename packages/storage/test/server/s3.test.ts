// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stsSendMock = vi.fn();
const s3SendMock = vi.fn();
const s3ClientInputs: unknown[] = [];

vi.mock("@aws-sdk/client-s3", () => {
  class S3Client {
    send = s3SendMock;

    constructor(input: unknown) {
      s3ClientInputs.push(input);
    }
  }

  class CopyObjectCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  class DeleteObjectCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  class PutObjectCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  class HeadObjectCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  class GetObjectCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    S3Client,
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async (_client: unknown, command: unknown, options: unknown) => {
    const input = (command as { input: { Key: string } }).input;
    const expiresIn = (options as { expiresIn: number }).expiresIn;
    return `https://signed.example.test/${input.Key}?expires=${expiresIn}`;
  }),
}));

vi.mock("@aws-sdk/client-sts", () => {
  class STSClient {
    send = stsSendMock;
  }

  class AssumeRoleCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  class GetFederationTokenCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    STSClient,
    AssumeRoleCommand,
    GetFederationTokenCommand,
  };
});

const BASE_CONFIG = {
  bucket: "merchant-debug-bucket",
  regionId: "ap-southeast-1",
  directoryPrefix: "uploads/debug",
  maxSizeBytes: 10485760,
  multipartThresholdBytes: 6291456,
  multipartPartSizeBytes: 5242880,
};

beforeEach(() => {
  stsSendMock.mockReset();
  s3SendMock.mockReset();
  s3ClientInputs.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("createS3UploadSession", () => {
  it("uses AssumeRole when a role ARN is configured", async () => {
    stsSendMock.mockResolvedValueOnce({
      Credentials: {
        AccessKeyId: "temp-ak",
        SecretAccessKey: "temp-sk",
        SessionToken: "temp-token",
        Expiration: new Date("2026-05-21T09:00:00.000Z"),
      },
    });

    const { createS3UploadSession } = await import("../../src/server/s3.ts");
    const session = await createS3UploadSession(
      {
        ...BASE_CONFIG,
        stsRoleArn: "arn:aws:iam::123456789012:role/merchant-upload",
        stsExternalId: "merchant-local",
        stsDurationSeconds: 1800,
        stsSessionName: "merchant-s3-debug",
      },
      {
        filename: "Contract Final.pdf",
        contentType: "application/pdf",
        size: 5 * 1024 * 1024,
        directory: "signed/contracts",
      },
    );

    expect(session.sessionMode).toBe("assume-role");
    expect(session.bucket).toBe("merchant-debug-bucket");
    expect(session.objectKey).toMatch(/^signed\/contracts\/\d{8}-[0-9a-f-]+-contract-final\.pdf$/);
    expect(session.objectUrl).toContain(session.objectKey);
    expect(session.credentials).toMatchObject({
      accessKeyId: "temp-ak",
      secretAccessKey: "temp-sk",
      sessionToken: "temp-token",
      expiration: "2026-05-21T09:00:00.000Z",
    });

    const command = stsSendMock.mock.calls[0]?.[0] as { input: Record<string, string> };
    expect(command.input.RoleArn).toBe("arn:aws:iam::123456789012:role/merchant-upload");
    expect(command.input.ExternalId).toBe("merchant-local");
    expect(command.input.Policy).toContain(
      `arn:aws:s3:::merchant-debug-bucket/${session.objectKey}`,
    );
  });

  it("falls back to GetFederationToken when no role ARN is configured", async () => {
    stsSendMock.mockResolvedValueOnce({
      Credentials: {
        AccessKeyId: "temp-ak",
        SecretAccessKey: "temp-sk",
        SessionToken: "temp-token",
        Expiration: new Date("2026-05-21T10:00:00.000Z"),
      },
    });

    const { createS3UploadSession, getS3ConfigSummary } = await import("../../src/server/s3.ts");
    const summary = getS3ConfigSummary(BASE_CONFIG);
    const session = await createS3UploadSession(BASE_CONFIG, {
      filename: "avatar.png",
      contentType: "image/png",
      size: 1024,
    });

    expect(summary.sessionMode).toBe("get-federation-token");
    expect(summary.uploadUrl).toBe("https://merchant-debug-bucket.s3.ap-southeast-1.amazonaws.com");
    expect(summary.usesCustomUploadHost).toBe(false);
    expect(session.sessionMode).toBe("get-federation-token");
    expect(session.directoryPrefix).toBe("uploads/debug/");

    const command = stsSendMock.mock.calls[0]?.[0] as { input: Record<string, string> };
    expect(command.input.Name).toMatch(/^cloud-s3-upload-/);
    expect(command.input.Policy).toContain(
      `arn:aws:s3:::merchant-debug-bucket/${session.objectKey}`,
    );
  });

  it("normalizes custom upload hosts supplied by consumers", async () => {
    const { getS3ConfigSummary } = await import("../../src/server/s3.ts");

    const summary = getS3ConfigSummary({
      ...BASE_CONFIG,
      uploadUrl: "cdn.example.com/uploads/",
    });

    expect(summary.uploadUrl).toBe("https://cdn.example.com/uploads");
    expect(summary.usesCustomUploadHost).toBe(true);
  });
});

describe("uploadFileToS3FromServer", () => {
  it("uses AssumeRole credentials for server-side uploads when a role ARN is configured", async () => {
    stsSendMock.mockResolvedValueOnce({
      Credentials: {
        AccessKeyId: "server-temp-ak",
        SecretAccessKey: "server-temp-sk",
        SessionToken: "server-temp-token",
        Expiration: new Date("2026-05-21T11:00:00.000Z"),
      },
    });
    s3SendMock.mockResolvedValueOnce({ ETag: '"etag-value"' });

    const { uploadFileToS3FromServer } = await import("../../src/server/s3.ts");
    const storedObject = await uploadFileToS3FromServer(
      {
        ...BASE_CONFIG,
        stsRoleArn: "arn:aws:iam::123456789012:role/merchant-upload",
        stsExternalId: "merchant-local",
        stsDurationSeconds: 1800,
      },
      {
        body: new Uint8Array([1, 2, 3]),
        filename: "server.txt",
        contentType: "text/plain",
        directory: "server/uploads",
      },
    );

    expect(storedObject.etag).toBe('"etag-value"');
    expect(storedObject.objectKey).toMatch(/^server\/uploads\/\d{8}-[0-9a-f-]+-server\.txt$/);

    const stsCommand = stsSendMock.mock.calls[0]?.[0] as { input: Record<string, string> };
    expect(stsCommand.input.RoleArn).toBe("arn:aws:iam::123456789012:role/merchant-upload");
    expect(stsCommand.input.Policy).toContain(
      `arn:aws:s3:::merchant-debug-bucket/${storedObject.objectKey}`,
    );

    const s3ClientInput = s3ClientInputs[0] as {
      credentials?: {
        accessKeyId?: string;
        secretAccessKey?: string;
        sessionToken?: string;
      };
    };
    expect(s3ClientInput.credentials).toMatchObject({
      accessKeyId: "server-temp-ak",
      secretAccessKey: "server-temp-sk",
      sessionToken: "server-temp-token",
    });

    const putCommand = s3SendMock.mock.calls[0]?.[0] as {
      input: Record<string, string>;
    };
    expect(putCommand.input.Bucket).toBe("merchant-debug-bucket");
    expect(putCommand.input.Key).toBe(storedObject.objectKey);
  });
});

describe("getS3ObjectMetadata", () => {
  it("reads object metadata from the configured bucket", async () => {
    s3SendMock.mockResolvedValueOnce({
      ContentLength: 42,
      ContentType: "application/zip",
      ETag: '"metadata-etag"',
      LastModified: new Date("2026-05-21T12:00:00.000Z"),
    });

    const { getS3ObjectMetadata } = await import("../../src/server/s3.ts");
    const metadata = await getS3ObjectMetadata(BASE_CONFIG, {
      objectKey: "uploads/app.zip",
    });

    expect(metadata).toMatchObject({
      bucket: "merchant-debug-bucket",
      objectKey: "uploads/app.zip",
      contentType: "application/zip",
      sizeBytes: 42,
      etag: '"metadata-etag"',
      lastModified: "2026-05-21T12:00:00.000Z",
    });

    const headCommand = s3SendMock.mock.calls[0]?.[0] as {
      input: Record<string, string>;
    };
    expect(headCommand.input.Bucket).toBe("merchant-debug-bucket");
    expect(headCommand.input.Key).toBe("uploads/app.zip");
  });
});

describe("getS3ObjectBytes", () => {
  it("reads a byte range from the configured bucket", async () => {
    s3SendMock.mockResolvedValueOnce({
      Body: {
        transformToByteArray: vi.fn(async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47])),
      },
    });

    const { getS3ObjectBytes } = await import("../../src/server/s3.ts");
    const bytes = await getS3ObjectBytes(BASE_CONFIG, {
      objectKey: "uploads/icon.png",
      range: "bytes=0-31",
    });

    expect(Array.from(bytes)).toEqual([0x89, 0x50, 0x4e, 0x47]);

    const getCommand = s3SendMock.mock.calls[0]?.[0] as {
      input: Record<string, string>;
    };
    expect(getCommand.input.Bucket).toBe("merchant-debug-bucket");
    expect(getCommand.input.Key).toBe("uploads/icon.png");
    expect(getCommand.input.Range).toBe("bytes=0-31");
  });
});

describe("createS3StoredObjectReference", () => {
  it("builds an object reference without calling S3", async () => {
    const { createS3StoredObjectReference } = await import("../../src/server/s3.ts");

    const reference = createS3StoredObjectReference(BASE_CONFIG, {
      objectKey: "uploads/app.zip",
      contentType: "application/zip",
      sizeBytes: 123,
      etag: '"etag"',
    });

    expect(reference).toMatchObject({
      bucket: "merchant-debug-bucket",
      objectKey: "uploads/app.zip",
      objectUrl: "https://merchant-debug-bucket.s3.ap-southeast-1.amazonaws.com/uploads/app.zip",
      contentType: "application/zip",
      sizeBytes: 123,
      etag: '"etag"',
    });
    expect(s3SendMock).not.toHaveBeenCalled();
  });
});

describe("copyS3Object", () => {
  it("copies an object into a new key and returns the stored object reference", async () => {
    s3SendMock.mockResolvedValueOnce({
      CopyObjectResult: {
        ETag: '"copy-etag"',
      },
    });

    const { copyS3Object } = await import("../../src/server/s3.ts");
    const storedObject = await copyS3Object(BASE_CONFIG, {
      sourceObjectKey: "tmp/icon one.png",
      targetObjectKey: "public/applications/icons/icon one.png",
      contentType: "image/png",
      sizeBytes: 2048,
    });

    expect(storedObject).toMatchObject({
      bucket: "merchant-debug-bucket",
      objectKey: "public/applications/icons/icon one.png",
      objectUrl:
        "https://merchant-debug-bucket.s3.ap-southeast-1.amazonaws.com/public/applications/icons/icon%20one.png",
      contentType: "image/png",
      sizeBytes: 2048,
      etag: '"copy-etag"',
    });

    const copyCommand = s3SendMock.mock.calls[0]?.[0] as {
      input: Record<string, string>;
    };
    expect(copyCommand.input.Bucket).toBe("merchant-debug-bucket");
    expect(copyCommand.input.Key).toBe("public/applications/icons/icon one.png");
    expect(copyCommand.input.CopySource).toBe("merchant-debug-bucket/tmp/icon%20one.png");
    expect(copyCommand.input.IfNoneMatch).toBe("*");
    expect(copyCommand.input.MetadataDirective).toBe("REPLACE");
  });

  it("uses scoped read and write credentials when a role ARN is configured", async () => {
    stsSendMock.mockResolvedValueOnce({
      Credentials: {
        AccessKeyId: "copy-temp-ak",
        SecretAccessKey: "copy-temp-sk",
        SessionToken: "copy-temp-token",
        Expiration: new Date("2026-05-21T14:00:00.000Z"),
      },
    });
    s3SendMock.mockResolvedValueOnce({
      CopyObjectResult: {
        ETag: '"copy-etag"',
      },
    });

    const { copyS3Object } = await import("../../src/server/s3.ts");
    await copyS3Object(
      {
        ...BASE_CONFIG,
        stsRoleArn: "arn:aws:iam::123456789012:role/merchant-storage",
      },
      {
        sourceObjectKey: "tmp/icon.png",
        targetObjectKey: "public/applications/icons/icon.png",
        contentType: "image/png",
      },
    );

    const stsCommand = stsSendMock.mock.calls[0]?.[0] as { input: Record<string, string> };
    expect(stsCommand.input.Policy).toContain("s3:GetObject");
    expect(stsCommand.input.Policy).toContain("s3:PutObject");
    expect(stsCommand.input.Policy).toContain("merchant-debug-bucket/tmp/icon.png");
    expect(stsCommand.input.Policy).toContain(
      "merchant-debug-bucket/public/applications/icons/icon.png",
    );

    const s3ClientInput = s3ClientInputs[0] as {
      credentials?: {
        accessKeyId?: string;
      };
    };
    expect(s3ClientInput.credentials?.accessKeyId).toBe("copy-temp-ak");
  });

  it("rejects copy operations that would overwrite the same key", async () => {
    const { copyS3Object } = await import("../../src/server/s3.ts");

    await expect(
      copyS3Object(BASE_CONFIG, {
        sourceObjectKey: "tmp/icon.png",
        targetObjectKey: "tmp/icon.png",
      }),
    ).rejects.toThrow("sourceObjectKey and targetObjectKey must be different.");
    expect(s3SendMock).not.toHaveBeenCalled();
  });
});

describe("deleteS3Object", () => {
  it("deletes an object from the configured bucket", async () => {
    s3SendMock.mockResolvedValueOnce({});

    const { deleteS3Object } = await import("../../src/server/s3.ts");
    await deleteS3Object(BASE_CONFIG, {
      objectKey: "tmp/icon.png",
    });

    const deleteCommand = s3SendMock.mock.calls[0]?.[0] as {
      input: Record<string, string>;
    };
    expect(deleteCommand.input.Bucket).toBe("merchant-debug-bucket");
    expect(deleteCommand.input.Key).toBe("tmp/icon.png");
  });

  it("uses scoped delete credentials when a role ARN is configured", async () => {
    stsSendMock.mockResolvedValueOnce({
      Credentials: {
        AccessKeyId: "delete-temp-ak",
        SecretAccessKey: "delete-temp-sk",
        SessionToken: "delete-temp-token",
        Expiration: new Date("2026-05-21T15:00:00.000Z"),
      },
    });
    s3SendMock.mockResolvedValueOnce({});

    const { deleteS3Object } = await import("../../src/server/s3.ts");
    await deleteS3Object(
      {
        ...BASE_CONFIG,
        stsRoleArn: "arn:aws:iam::123456789012:role/merchant-storage",
      },
      {
        objectKey: "tmp/icon.png",
      },
    );

    const stsCommand = stsSendMock.mock.calls[0]?.[0] as { input: Record<string, string> };
    expect(stsCommand.input.Policy).toContain("s3:DeleteObject");
    expect(stsCommand.input.Policy).not.toContain("s3:GetObject");
    expect(stsCommand.input.Policy).not.toContain("s3:PutObject");
    expect(stsCommand.input.Policy).toContain("merchant-debug-bucket/tmp/icon.png");

    const s3ClientInput = s3ClientInputs[0] as {
      credentials?: {
        accessKeyId?: string;
      };
    };
    expect(s3ClientInput.credentials?.accessKeyId).toBe("delete-temp-ak");
  });
});

describe("createS3DownloadUrl", () => {
  it("creates a short-lived signed GET URL", async () => {
    const { createS3DownloadUrl } = await import("../../src/server/s3.ts");

    const url = await createS3DownloadUrl(BASE_CONFIG, {
      objectKey: "uploads/app.zip",
      filename: 'release-"final".zip',
      expiresInSeconds: 30,
    });

    expect(url).toBe("https://signed.example.test/uploads/app.zip?expires=60");
  });

  it("uses scoped read credentials when a role ARN is configured", async () => {
    stsSendMock.mockResolvedValueOnce({
      Credentials: {
        AccessKeyId: "read-temp-ak",
        SecretAccessKey: "read-temp-sk",
        SessionToken: "read-temp-token",
        Expiration: new Date("2026-05-21T13:00:00.000Z"),
      },
    });

    const { createS3DownloadUrl } = await import("../../src/server/s3.ts");
    await createS3DownloadUrl(
      {
        ...BASE_CONFIG,
        stsRoleArn: "arn:aws:iam::123456789012:role/merchant-storage",
      },
      {
        objectKey: "uploads/app.zip",
      },
    );

    const stsCommand = stsSendMock.mock.calls[0]?.[0] as { input: Record<string, string> };
    expect(stsCommand.input.Policy).toContain("s3:GetObject");
    expect(stsCommand.input.Policy).not.toContain("s3:PutObject");

    const s3ClientInput = s3ClientInputs[0] as {
      credentials?: {
        accessKeyId?: string;
      };
    };
    expect(s3ClientInput.credentials?.accessKeyId).toBe("read-temp-ak");
  });
});
