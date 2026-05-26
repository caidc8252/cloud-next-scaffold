import { requireSession } from "@cloud/permissions/server";
import { ContentHeader, Stack } from "@cloud/ui/components/layout";
import { S3UploadDemo } from "../../../../storage/s3-upload-demo";

export default async function S3UploadDemoPage() {
  await requireSession();

  return (
    <Stack gap="var(--space-6)">
      <ContentHeader
        title="S3 Upload Demo"
        description="Upload a file to the configured Amazon S3 bucket."
      />
      <S3UploadDemo />
    </Stack>
  );
}
