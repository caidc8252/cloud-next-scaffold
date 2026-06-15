export type StorageFileObject = {
  bucket: string;
  regionId: string;
  uploadUrl: string;
  objectKey: string;
  objectUrl: string;
  contentType: string;
  sizeBytes?: number;
  etag?: string;
  lastModified?: string;
};

export type StorageVisibility = "PRIVATE" | "PUBLIC";
