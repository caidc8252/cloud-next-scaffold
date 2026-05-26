"use client";

import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { request, RequestError } from "@cloud/request/client";
import type { ErrorBody, SuccessBody } from "@cloud/request/client";
import type { S3StoredObject, S3UploadSession } from "@cloud/storage";
import { uploadFileToS3FromBrowser } from "@cloud/storage/client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Progress,
} from "@cloud/ui/components/ui";
import { Stack } from "@cloud/ui/components/layout";
import { SERVER_S3_UPLOAD_THRESHOLD_BYTES } from "../lib/s3-upload-policy";

type UploadState =
  | "idle"
  | "server-uploading"
  | "creating-session"
  | "uploading"
  | "done"
  | "error";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof RequestError) return error.message;
  if (error instanceof Error) return error.message;
  return "Upload failed.";
}

async function uploadFileThroughServer(
  file: File,
  directory: string,
  signal: AbortSignal,
): Promise<S3StoredObject> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("directory", directory);

  const response = await fetch("/api/storage/s3-upload-server", {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    let body: ErrorBody | undefined;
    try {
      body = (await response.json()) as ErrorBody;
    } catch {}
    throw new RequestError(body?.message ?? `HTTP ${response.status}`, response.status, body);
  }

  const body = (await response.json()) as SuccessBody<S3StoredObject>;
  return body.data;
}

export function S3UploadDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [directory, setDirectory] = useState("debug");
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isMultipart, setIsMultipart] = useState(false);
  const [storedObject, setStoredObject] = useState<S3StoredObject | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isBusy =
    state === "server-uploading" || state === "creating-session" || state === "uploading";
  const shouldUploadThroughServer = file ? file.size <= SERVER_S3_UPLOAD_THRESHOLD_BYTES : false;

  async function handleUpload() {
    if (!file || isBusy) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setState("creating-session");
    setError(null);
    setProgress(0);
    setStoredObject(null);
    setIsMultipart(false);

    try {
      if (file.size <= SERVER_S3_UPLOAD_THRESHOLD_BYTES) {
        setState("server-uploading");
        const result = await uploadFileThroughServer(file, directory, abortController.signal);
        setProgress(100);
        setStoredObject(result);
        setState("done");
        return;
      }

      const response = await request.post<S3UploadSession>(
        "/api/storage/s3-upload-session",
        {
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          directory,
        },
        { signal: abortController.signal },
      );

      setIsMultipart(file.size > response.data.multipartThresholdBytes);
      setState("uploading");

      const result = await uploadFileToS3FromBrowser({
        file,
        session: response.data,
        signal: abortController.signal,
        onProgress: (nextProgress) => {
          setProgress(nextProgress.percent);
          setIsMultipart(nextProgress.isMultipart);
        },
      });

      setProgress(100);
      setStoredObject(result);
      setState("done");
    } catch (cause) {
      if (abortController.signal.aborted) {
        setState("idle");
        setError(null);
      } else {
        setState("error");
        setError(getErrorMessage(cause));
      }
    } finally {
      abortControllerRef.current = null;
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  return (
    <Stack gap="var(--space-4)">
      <Card>
        <CardHeader>
          <CardTitle>S3 Upload</CardTitle>
          <CardDescription>
            Files up to 5 MB upload through the server. Larger files upload directly to S3; files
            over 100 MB use multipart upload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Stack gap="var(--space-4)">
            <div className="grid gap-3 md:grid-cols-[1fr_240px]">
              <Input
                type="file"
                disabled={isBusy}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setStoredObject(null);
                  setError(null);
                  setProgress(0);
                }}
              />
              <Input
                value={directory}
                disabled={isBusy}
                placeholder="debug"
                onChange={(event) => setDirectory(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                loading={isBusy}
                disabled={!file || isBusy}
                iconLeft={<UploadCloud size={16} />}
                onClick={handleUpload}
              >
                Upload
              </Button>
              {isBusy && (
                <Button
                  type="button"
                  variant="outline"
                  iconLeft={<X size={16} />}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              )}
              {file && <Badge tone="info">{formatBytes(file.size)}</Badge>}
              {file && (
                <Badge
                  tone={shouldUploadThroughServer ? "success" : isMultipart ? "warning" : "info"}
                >
                  {shouldUploadThroughServer
                    ? "Server upload"
                    : isMultipart
                      ? "Multipart"
                      : "Direct upload"}
                </Badge>
              )}
            </div>

            {(isBusy || state === "done") && (
              <Progress value={progress} tone={state === "done" ? "success" : "info"} />
            )}

            {error && <p className="text-sm text-error">{error}</p>}
          </Stack>
        </CardContent>
      </Card>

      {storedObject && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Object</CardTitle>
            <CardDescription>{storedObject.bucket}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm md:grid-cols-[140px_1fr]">
              <dt className="text-content-secondary">Object key</dt>
              <dd className="break-all font-mono">{storedObject.objectKey}</dd>
              <dt className="text-content-secondary">Object URL</dt>
              <dd className="break-all font-mono">{storedObject.objectUrl}</dd>
              <dt className="text-content-secondary">Content type</dt>
              <dd>{storedObject.contentType}</dd>
              {storedObject.etag && (
                <>
                  <dt className="text-content-secondary">ETag</dt>
                  <dd className="break-all font-mono">{storedObject.etag}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
