import { requirePermissions } from "@cloud/permissions/server";
import { ContentHeader, Stack } from "@cloud/ui/components/layout";
import { listStorageObjectRecords } from "@/lib/storage-object-records";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import { S3UploadDemo } from "@/storage/s3-upload-demo";

export default async function S3UploadDemoPage() {
  const session = await requirePermissions({ all: [STORAGE_PERMISSIONS.VIEW] });
  const records = await listStorageObjectRecords(session);

  return (
    <Stack gap="var(--space-6)">
      <ContentHeader
        title="S3 Upload Demo"
        description="Upload files to the configured Amazon S3 bucket and download previous uploads."
      />
      <S3UploadDemo initialRecords={records} />
    </Stack>
  );
}
