export type StorageObjectRecord = {
  id: string;
  bucket: string;
  regionId: string;
  objectKey: string;
  objectUrl: string;
  accessUrl: string | null;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  contentHash: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  etag: string | null;
  status: string;
  uploadedAt: string;
  uploadedBy: string;
};

export type CompleteS3UploadRequest = {
  objectKey?: string;
  originalFilename?: string;
  contentType?: string;
  sizeBytes?: number;
  contentHash?: string;
  visibility?: "PRIVATE" | "PUBLIC";
  etag?: string;
};

export type DuplicateStorageObjectResponse = {
  record: StorageObjectRecord | null;
};

export type StorageVisibility = StorageObjectRecord["visibility"];

export type S3DownloadUrlResponse = {
  url: string;
  expiresInSeconds: number;
};

export type StorageAttachmentRecord = {
  id: string;
  storageObjectId: string;
  subjectType: string;
  subjectId: string;
  purpose: string;
  displayName: string | null;
  sortNo: number;
  isPrimary: boolean;
  status: string;
  attachedAt: string;
  storageObject: StorageObjectRecord;
};

export type BindStorageAttachmentRequest = {
  storageObjectId?: string;
  subjectType?: string;
  subjectId?: string;
  purpose?: string;
  displayName?: string;
  sortNo?: number;
  isPrimary?: boolean;
};
