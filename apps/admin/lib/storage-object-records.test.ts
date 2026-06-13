// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const storageObjectFindFirstMock = vi.fn();
const storageObjectCreateMock = vi.fn();
const storageObjectUpdateMock = vi.fn();
const uploadFileToS3FromServerMock = vi.fn();
const copyS3ObjectMock = vi.fn();
const deleteS3ObjectMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@cloud/db", () => ({
  prisma: {
    storageObject: {
      findFirst: storageObjectFindFirstMock,
      create: storageObjectCreateMock,
      update: storageObjectUpdateMock,
    },
  },
}));

vi.mock("@cloud/storage/server", () => ({
  uploadFileToS3FromServer: uploadFileToS3FromServerMock,
  copyS3Object: copyS3ObjectMock,
  deleteS3Object: deleteS3ObjectMock,
}));

vi.mock("./s3-upload-config", () => ({
  getS3UploadConfig: () => ({
    bucket: "bucket",
    regionId: "ap-southeast-1",
    directoryPrefix: "uploads",
    maxSizeBytes: 10485760,
    multipartThresholdBytes: 6291456,
    multipartPartSizeBytes: 5242880,
  }),
}));

const session = {
  userId: 7,
  currentPartyId: 100,
} as never;

function storageObjectRow(overrides: Record<string, unknown> = {}) {
  return {
    storageObjectId: "storage-1",
    partyId: 100,
    uploaderUserId: 7,
    bucket: "bucket",
    regionId: "ap-southeast-1",
    objectKey: "tmp/20260613-icon.png",
    objectUrl: "https://cdn.test/tmp/20260613-icon.png",
    originalFilename: "icon.png",
    contentType: "image/png",
    sizeBytes: BigInt(123),
    contentHash: "hash",
    visibility: "PRIVATE",
    etag: '"etag"',
    status: "TEMPORARY",
    creTime: new Date("2026-06-13T00:00:00.000Z"),
    uploader: {
      nickName: "Alice",
    },
    ...overrides,
  };
}

function fileLike(): File {
  return {
    name: "icon.png",
    type: "image/png",
    size: 123,
    arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
  } as unknown as File;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uploadTemporaryStorageObject", () => {
  it("uploads to tmp and stores a TEMPORARY private storage object", async () => {
    uploadFileToS3FromServerMock.mockResolvedValueOnce({
      bucket: "bucket",
      regionId: "ap-southeast-1",
      objectKey: "tmp/20260613-icon.png",
      objectUrl: "https://cdn.test/tmp/20260613-icon.png",
      contentType: "image/png",
      sizeBytes: 123,
      etag: '"etag"',
    });
    storageObjectFindFirstMock.mockResolvedValueOnce(null);
    storageObjectCreateMock.mockResolvedValueOnce(storageObjectRow());

    const { uploadTemporaryStorageObject } = await import("./storage-object-records");
    const record = await uploadTemporaryStorageObject(session, {
      file: fileLike(),
      contentHash: "hash",
    });

    expect(uploadFileToS3FromServerMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        filename: "icon.png",
        contentType: "image/png",
        directory: "tmp",
      }),
    );
    expect(storageObjectCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partyId: 100,
          objectKey: "tmp/20260613-icon.png",
          visibility: "PRIVATE",
          status: "TEMPORARY",
          contentHash: "hash",
        }),
      }),
    );
    expect(record).toMatchObject({
      id: "storage-1",
      objectKey: "tmp/20260613-icon.png",
      accessUrl: null,
      status: "TEMPORARY",
    });
  });
});

describe("promoteTemporaryStorageObject", () => {
  it("copies the temporary object to the target profile, updates the row, and deletes tmp", async () => {
    storageObjectFindFirstMock.mockResolvedValueOnce(storageObjectRow());
    copyS3ObjectMock.mockResolvedValueOnce({
      bucket: "bucket",
      regionId: "ap-southeast-1",
      objectKey: "public/applications/icons/20260613-icon.png",
      objectUrl: "https://cdn.test/public/applications/icons/20260613-icon.png",
      contentType: "image/png",
      sizeBytes: 123,
      etag: '"copy-etag"',
    });
    storageObjectUpdateMock.mockResolvedValueOnce(
      storageObjectRow({
        objectKey: "public/applications/icons/20260613-icon.png",
        objectUrl: "https://cdn.test/public/applications/icons/20260613-icon.png",
        visibility: "PUBLIC",
        status: "ACTIVE",
        etag: '"copy-etag"',
      }),
    );
    deleteS3ObjectMock.mockResolvedValueOnce(undefined);

    const { promoteTemporaryStorageObject } = await import("./storage-object-records");
    const record = await promoteTemporaryStorageObject(session, {
      storageObjectId: "storage-1",
      targetProfile: "application.icon",
      requireContentTypePrefix: "image/",
    });

    expect(copyS3ObjectMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sourceObjectKey: "tmp/20260613-icon.png",
        targetObjectKey: "public/applications/icons/20260613-icon.png",
        contentType: "image/png",
        sizeBytes: 123,
      }),
    );
    expect(storageObjectUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storageObjectId: "storage-1" },
        data: expect.objectContaining({
          objectKey: "public/applications/icons/20260613-icon.png",
          visibility: "PUBLIC",
          status: "ACTIVE",
          deletedAt: null,
        }),
      }),
    );
    expect(deleteS3ObjectMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        objectKey: "tmp/20260613-icon.png",
      }),
    );
    expect(record).toMatchObject({
      id: "storage-1",
      visibility: "PUBLIC",
      accessUrl: "https://cdn.test/public/applications/icons/20260613-icon.png",
      status: "ACTIVE",
    });
  });
});
