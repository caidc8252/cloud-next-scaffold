// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const createS3UploadSessionMock = vi.fn();
const uploadFileToS3FromServerMock = vi.fn();
const getS3ObjectMetadataMock = vi.fn();
const createS3DownloadUrlMock = vi.fn();
const copyS3ObjectMock = vi.fn();
const deleteS3ObjectMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@cloud/storage/server", () => ({
  createS3UploadSession: createS3UploadSessionMock,
  uploadFileToS3FromServer: uploadFileToS3FromServerMock,
  getS3ObjectMetadata: getS3ObjectMetadataMock,
  createS3DownloadUrl: createS3DownloadUrlMock,
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

describe("uploadFileToS3Profile", () => {
  it("uploads to the selected profile directory and returns S3 metadata only", async () => {
    uploadFileToS3FromServerMock.mockResolvedValueOnce({
      bucket: "bucket",
      regionId: "ap-southeast-1",
      uploadUrl: "https://bucket.s3.ap-southeast-1.amazonaws.com",
      objectKey: "public/applications/icons/20260615-icon.png",
      objectUrl: "https://bucket.s3.ap-southeast-1.amazonaws.com/public/applications/icons/20260615-icon.png",
      contentType: "image/png",
      sizeBytes: 123,
      etag: '"etag"',
    });

    const { uploadFileToS3Profile } = await import("./storage-files");
    const result = await uploadFileToS3Profile({
      file: fileLike(),
      uploadProfile: "application.icon",
    });

    expect(uploadFileToS3FromServerMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        filename: "icon.png",
        contentType: "image/png",
        directory: "public/applications/icons",
      }),
    );
    expect(result).toMatchObject({
      bucket: "bucket",
      objectKey: "public/applications/icons/20260615-icon.png",
      objectUrl: expect.stringContaining("public/applications/icons"),
      contentType: "image/png",
      sizeBytes: 123,
      etag: '"etag"',
    });
  });
});

describe("promoteTemporaryS3Object", () => {
  it("copies a tmp object to the target profile and deletes the tmp object", async () => {
    copyS3ObjectMock.mockResolvedValueOnce({
      bucket: "bucket",
      regionId: "ap-southeast-1",
      uploadUrl: "https://bucket.s3.ap-southeast-1.amazonaws.com",
      objectKey: "public/applications/icons/icon.png",
      objectUrl: "https://bucket.s3.ap-southeast-1.amazonaws.com/public/applications/icons/icon.png",
      contentType: "image/png",
      sizeBytes: 123,
      etag: '"copy-etag"',
    });

    const { promoteTemporaryS3Object } = await import("./storage-files");
    const result = await promoteTemporaryS3Object({
      temporaryObject: {
        objectKey: "tmp/icon.png",
        originalFilename: "icon.png",
        contentType: "image/png",
        sizeBytes: 123,
      },
      targetProfile: "application.icon",
      requireContentTypePrefix: "image/",
    });

    expect(copyS3ObjectMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sourceObjectKey: "tmp/icon.png",
        targetObjectKey: "public/applications/icons/icon.png",
        contentType: "image/png",
        sizeBytes: 123,
      }),
    );
    expect(deleteS3ObjectMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        objectKey: "tmp/icon.png",
      }),
    );
    expect(result).toMatchObject({
      objectKey: "public/applications/icons/icon.png",
      contentType: "image/png",
      sizeBytes: 123,
    });
  });
});

describe("createPrivateS3DownloadUrl", () => {
  it("checks the object and returns a signed url", async () => {
    getS3ObjectMetadataMock.mockResolvedValueOnce({
      objectKey: "applications/packages/app.zip",
    });
    createS3DownloadUrlMock.mockResolvedValueOnce("https://signed.example/app.zip");

    const { createPrivateS3DownloadUrl } = await import("./storage-files");
    const url = await createPrivateS3DownloadUrl({
      objectKey: "applications/packages/app.zip",
      filename: "app.zip",
    });

    expect(getS3ObjectMetadataMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        objectKey: "applications/packages/app.zip",
      }),
    );
    expect(createS3DownloadUrlMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        objectKey: "applications/packages/app.zip",
        filename: "app.zip",
      }),
    );
    expect(url).toBe("https://signed.example/app.zip");
  });
});
