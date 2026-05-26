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

  class PutObjectCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    S3Client,
    PutObjectCommand,
  };
});

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
