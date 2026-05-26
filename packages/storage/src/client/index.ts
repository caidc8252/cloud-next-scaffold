"use client";
import "client-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { S3StoredObject, S3UploadSession } from "../index.ts";

export type UploadFileToS3FromBrowserInput = {
  file: Blob;
  session: S3UploadSession;
  signal?: AbortSignal;
  onProgress?: (progress: S3UploadProgress) => void;
};

export type S3UploadProgress = {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  isMultipart: boolean;
};

async function createBrowserPutObjectBody(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

function createS3Client(session: S3UploadSession): S3Client {
  return new S3Client({
    region: session.regionId,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: session.credentials.accessKeyId,
      secretAccessKey: session.credentials.secretAccessKey,
      sessionToken: session.credentials.sessionToken,
      expiration: new Date(session.credentials.expiration),
    },
    ...(session.usesCustomUploadHost
      ? {
          endpoint: session.uploadUrl,
          bucketEndpoint: true,
        }
      : {}),
  });
}

function notifyProgress(
  input: UploadFileToS3FromBrowserInput,
  loadedBytes: number,
  isMultipart: boolean,
) {
  const totalBytes = input.file.size;
  input.onProgress?.({
    loadedBytes,
    totalBytes,
    percent: totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0,
    isMultipart,
  });
}

function createStoredObject(session: S3UploadSession, file: Blob, etag?: string): S3StoredObject {
  return {
    bucket: session.bucket,
    regionId: session.regionId,
    uploadUrl: session.uploadUrl,
    objectKey: session.objectKey,
    objectUrl: session.objectUrl,
    contentType: file.type || "application/octet-stream",
    etag,
  };
}

export async function uploadFileToS3FromBrowser(
  input: UploadFileToS3FromBrowserInput,
): Promise<S3StoredObject> {
  const contentType = input.file.type || "application/octet-stream";
  const isMultipart = input.file.size > input.session.multipartThresholdBytes;
  const client = createS3Client(input.session);

  notifyProgress(input, 0, isMultipart);

  if (!isMultipart) {
    const response = await client.send(
      new PutObjectCommand({
        Bucket: input.session.bucket,
        Key: input.session.objectKey,
        Body: await createBrowserPutObjectBody(input.file),
        ContentType: contentType,
      }),
      { abortSignal: input.signal },
    );

    notifyProgress(input, input.file.size, false);
    return createStoredObject(input.session, input.file, response.ETag);
  }

  const upload = new Upload({
    client,
    params: {
      Bucket: input.session.bucket,
      Key: input.session.objectKey,
      Body: input.file,
      ContentType: contentType,
    },
    partSize: input.session.multipartPartSizeBytes,
    queueSize: 4,
    leavePartsOnError: false,
  });

  if (input.signal) {
    input.signal.addEventListener("abort", () => {
      upload.abort();
    });
  }

  upload.on("httpUploadProgress", (progress) => {
    notifyProgress(input, progress.loaded ?? 0, true);
  });

  const result = await upload.done();
  notifyProgress(input, input.file.size, true);

  return createStoredObject(input.session, input.file, result.ETag);
}
