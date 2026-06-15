import { PageBody } from "@cloud/ui/components/layout";
import { requireSession } from "@cloud/permissions/server";
import { listStorageObjectRecords } from "@/lib/storage-object-records";
import { S3UploadDemo } from "@/storage/s3-upload-demo";

export default async function S3UploadDemoPage() {
  const session = await requireSession();
  const initialRecords = await listStorageObjectRecords(session);

  return (
    <PageBody>
      <S3UploadDemo initialRecords={initialRecords} />
    </PageBody>
  );
}
