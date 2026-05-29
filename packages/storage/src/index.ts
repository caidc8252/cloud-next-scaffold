export type S3SessionMode = "assume-role" | "get-federation-token";

export type S3ConfigSummary = {
  bucket: string;
  regionId: string;
  uploadUrl: string;
  usesCustomUploadHost: boolean;
  directoryPrefix: string;
  maxSizeBytes: number;
  multipartThresholdBytes: number;
  multipartPartSizeBytes: number;
  sessionMode: S3SessionMode;
};

export type S3StsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
};

export type S3UploadSession = S3ConfigSummary & {
  objectKey: string;
  objectUrl: string;
  credentials: S3StsCredentials;
};

export type S3StoredObject = {
  bucket: string;
  regionId: string;
  uploadUrl: string;
  objectKey: string;
  objectUrl: string;
  contentType: string;
  sizeBytes?: number;
  etag?: string;
};

export type S3ObjectMetadata = S3StoredObject & {
  lastModified?: string;
};
