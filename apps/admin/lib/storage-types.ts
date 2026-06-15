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

export type StorageVisibility = StorageObjectRecord["visibility"];
