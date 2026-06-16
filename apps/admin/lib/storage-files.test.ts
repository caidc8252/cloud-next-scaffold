// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const createS3UploadSessionMock = vi.fn();
const uploadFileToS3FromServerMock = vi.fn();
const getS3ObjectBytesMock = vi.fn();
const getS3ObjectMetadataMock = vi.fn();
const createS3DownloadUrlMock = vi.fn();
const copyS3ObjectMock = vi.fn();
const deleteS3ObjectMock = vi.fn();
const updateS3ObjectContentTypeMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@cloud/storage/server", () => ({
  createS3UploadSession: createS3UploadSessionMock,
  uploadFileToS3FromServer: uploadFileToS3FromServerMock,
  getS3ObjectBytes: getS3ObjectBytesMock,
  getS3ObjectMetadata: getS3ObjectMetadataMock,
  createS3DownloadUrl: createS3DownloadUrlMock,
  copyS3Object: copyS3ObjectMock,
  deleteS3Object: deleteS3ObjectMock,
  updateS3ObjectContentType: updateS3ObjectContentTypeMock,
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

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fileLike(input?: { type?: string; body?: Uint8Array }): File {
  const body = input?.body ?? PNG_BYTES;

  return {
    name: "icon.png",
    type: input?.type ?? "image/png",
    size: body.byteLength,
    arrayBuffer: vi.fn(async () => body.buffer),
  } as unknown as File;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createProfileUploadSession", () => {
  it("rejects an existing object key outside the selected profile directory", async () => {
    const { createProfileUploadSession } = await import("./storage-files");

    await expect(
      createProfileUploadSession({
        filename: "icon.png",
        contentType: "image/png",
        size: 123,
        uploadProfile: "application.icon",
        existingObjectKey: "applications/packages/icon.png",
      }),
    ).rejects.toMatchObject({
      code: "storage.object_key_profile_mismatch",
    });
    expect(createS3UploadSessionMock).not.toHaveBeenCalled();
  });
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
        body: PNG_BYTES,
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

  it("rejects a public image upload when bytes are not a supported image", async () => {
    const { uploadFileToS3Profile } = await import("./storage-files");

    await expect(
      uploadFileToS3Profile({
        file: fileLike({
          type: "image/png",
          body: new Uint8Array([0x3c, 0x73, 0x76, 0x67]),
        }),
        uploadProfile: "application.icon",
      }),
    ).rejects.toMatchObject({
      code: "storage.public_image_signature_invalid",
    });
    expect(uploadFileToS3FromServerMock).not.toHaveBeenCalled();
  });

  it("rejects an existing object key outside the selected profile directory", async () => {
    const { uploadFileToS3Profile } = await import("./storage-files");

    await expect(
      uploadFileToS3Profile({
        file: fileLike(),
        uploadProfile: "application.icon",
        existingObjectKey: "applications/packages/icon.png",
      }),
    ).rejects.toMatchObject({
      code: "storage.object_key_profile_mismatch",
    });
    expect(uploadFileToS3FromServerMock).not.toHaveBeenCalled();
  });
});

describe("getVerifiedS3FileMetadata", () => {
  it("uses S3 bytes instead of client supplied content type for public files", async () => {
    getS3ObjectMetadataMock.mockResolvedValueOnce({
      bucket: "bucket",
      regionId: "ap-southeast-1",
      uploadUrl: "https://bucket.s3.ap-southeast-1.amazonaws.com",
      objectKey: "public/applications/icons/icon.png",
      objectUrl: "https://bucket.s3.ap-southeast-1.amazonaws.com/public/applications/icons/icon.png",
      contentType: "image/png",
      sizeBytes: 123,
      etag: '"old-etag"',
    });
    getS3ObjectBytesMock.mockResolvedValueOnce(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
    updateS3ObjectContentTypeMock.mockResolvedValueOnce({
      objectKey: "public/applications/icons/icon.png",
      contentType: "image/jpeg",
      etag: '"updated-etag"',
    });
    getS3ObjectMetadataMock.mockResolvedValueOnce({
      bucket: "bucket",
      regionId: "ap-southeast-1",
      uploadUrl: "https://bucket.s3.ap-southeast-1.amazonaws.com",
      objectKey: "public/applications/icons/icon.png",
      objectUrl: "https://bucket.s3.ap-southeast-1.amazonaws.com/public/applications/icons/icon.png",
      contentType: "image/jpeg",
      sizeBytes: 123,
      etag: '"updated-etag"',
      lastModified: "2026-06-16T00:00:00.000Z",
    });

    const { getVerifiedS3FileMetadata } = await import("./storage-files");
    const result = await getVerifiedS3FileMetadata({
      objectKey: "public/applications/icons/icon.png",
      uploadProfile: "application.icon",
    });

    expect(getS3ObjectBytesMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        objectKey: "public/applications/icons/icon.png",
        range: "bytes=0-31",
      }),
    );
    expect(updateS3ObjectContentTypeMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        objectKey: "public/applications/icons/icon.png",
        contentType: "image/jpeg",
        sourceEtag: '"old-etag"',
      }),
    );
    expect(result.contentType).toBe("image/jpeg");
    expect(result.etag).toBe('"updated-etag"');
    expect(result.lastModified).toBe("2026-06-16T00:00:00.000Z");
  });

  it("rejects public metadata when S3 bytes are not a supported image", async () => {
    getS3ObjectMetadataMock.mockResolvedValueOnce({
      objectKey: "public/applications/icons/icon.svg",
      contentType: "image/svg+xml",
    });
    getS3ObjectBytesMock.mockResolvedValueOnce(new Uint8Array([0x3c, 0x73, 0x76, 0x67]));

    const { getVerifiedS3FileMetadata } = await import("./storage-files");

    await expect(
      getVerifiedS3FileMetadata({
        objectKey: "public/applications/icons/icon.svg",
        uploadProfile: "application.icon",
      }),
    ).rejects.toMatchObject({
      code: "storage.public_image_signature_invalid",
    });
  });
});

describe("promoteTemporaryS3Object", () => {
  it("copies a tmp object to the target profile and deletes the tmp object", async () => {
    getS3ObjectBytesMock.mockResolvedValueOnce(PNG_BYTES);
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
    getS3ObjectMetadataMock.mockResolvedValueOnce({
      bucket: "bucket",
      regionId: "ap-southeast-1",
      uploadUrl: "https://bucket.s3.ap-southeast-1.amazonaws.com",
      objectKey: "public/applications/icons/confirmed-icon.png",
      objectUrl:
        "https://bucket.s3.ap-southeast-1.amazonaws.com/public/applications/icons/confirmed-icon.png",
      contentType: "image/png",
      sizeBytes: 123,
      etag: '"head-etag"',
      lastModified: "2026-06-15T01:23:45.000Z",
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
        targetObjectKey: expect.stringMatching(
          /^public\/applications\/icons\/\d{8}-[0-9a-f-]+-icon\.png$/,
        ),
        contentType: "image/png",
        sizeBytes: 123,
      }),
    );
    const copiedTargetKey = copyS3ObjectMock.mock.calls[0]?.[1]?.targetObjectKey;
    expect(getS3ObjectMetadataMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        objectKey: copiedTargetKey,
      }),
    );
    expect(deleteS3ObjectMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        objectKey: "tmp/icon.png",
      }),
    );
    expect(result).toMatchObject({
      objectKey: "public/applications/icons/confirmed-icon.png",
      contentType: "image/png",
      sizeBytes: 123,
      etag: '"head-etag"',
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
      uploadProfile: "application.package",
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

  it("rejects an object key outside the selected private profile", async () => {
    const { createPrivateS3DownloadUrl } = await import("./storage-files");

    await expect(
      createPrivateS3DownloadUrl({
        objectKey: "debug/app.zip",
        uploadProfile: "application.package",
        filename: "app.zip",
      }),
    ).rejects.toMatchObject({
      code: "storage.object_key_profile_mismatch",
    });
    expect(getS3ObjectMetadataMock).not.toHaveBeenCalled();
    expect(createS3DownloadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects public and temporary profiles for private download signing", async () => {
    const { createPrivateS3DownloadUrl } = await import("./storage-files");

    await expect(
      createPrivateS3DownloadUrl({
        objectKey: "public/applications/icons/icon.png",
        uploadProfile: "application.icon",
      }),
    ).rejects.toMatchObject({
      code: "storage.private_download_profile_invalid",
    });

    await expect(
      createPrivateS3DownloadUrl({
        objectKey: "tmp/file.zip",
        uploadProfile: "temporary",
      }),
    ).rejects.toMatchObject({
      code: "storage.private_download_profile_invalid",
    });
    expect(getS3ObjectMetadataMock).not.toHaveBeenCalled();
    expect(createS3DownloadUrlMock).not.toHaveBeenCalled();
  });
});
