"use client";

import { useMemo, useRef, useState } from "react";
import { Download, RefreshCw, UploadCloud, X } from "lucide-react";
import { request, RequestError } from "@cloud/request/client";
import type { ErrorBody, SuccessBody } from "@cloud/request/client";
import type { S3UploadSession } from "@cloud/storage";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  type TableColumn,
} from "@cloud/ui/components/ui";
import { SERVER_S3_UPLOAD_THRESHOLD_BYTES } from "../lib/s3-upload-policy";
import {
  S3_UPLOAD_PROFILE_OPTIONS,
  S3_UPLOAD_PROFILES,
  type S3UploadProfile,
} from "../lib/s3-upload-profiles";
import type {
  DuplicateStorageObjectResponse,
  S3DownloadUrlResponse,
  StorageObjectRecord,
  StorageVisibility,
} from "./types";

const DEFAULT_UPLOAD_PROFILE = S3_UPLOAD_PROFILES.DEBUG_PRIVATE;

type UploadState =
  | "idle"
  | "hashing"
  | "checking-duplicate"
  | "server-uploading"
  | "creating-session"
  | "uploading"
  | "finalizing"
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof RequestError) return error.message;
  if (error instanceof Error) return error.message;
  return "Upload failed.";
}

async function calculateFileSha256(file: File, signal: AbortSignal): Promise<string> {
  if (signal.aborted) throw new DOMException("Upload aborted.", "AbortError");
  const buffer = await file.arrayBuffer();
  if (signal.aborted) throw new DOMException("Upload aborted.", "AbortError");
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  if (signal.aborted) throw new DOMException("Upload aborted.", "AbortError");

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function uploadFileThroughServer(
  file: File,
  uploadProfile: S3UploadProfile,
  signal: AbortSignal,
): Promise<StorageObjectRecord> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("uploadProfile", uploadProfile);

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

  const body = (await response.json()) as SuccessBody<StorageObjectRecord>;
  return body.data;
}

type S3UploadDemoProps = {
  initialRecords: StorageObjectRecord[];
};

export function S3UploadDemo({ initialRecords }: S3UploadDemoProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProfile, setUploadProfile] = useState<S3UploadProfile>(DEFAULT_UPLOAD_PROFILE);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isMultipart, setIsMultipart] = useState(false);
  const [records, setRecords] = useState<StorageObjectRecord[]>(initialRecords);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isBusy =
    state === "server-uploading" ||
    state === "hashing" ||
    state === "checking-duplicate" ||
    state === "creating-session" ||
    state === "uploading" ||
    state === "finalizing";
  const shouldUploadThroughServer = file ? file.size <= SERVER_S3_UPLOAD_THRESHOLD_BYTES : false;
  const selectedProfile =
    S3_UPLOAD_PROFILE_OPTIONS.find((profile) => profile.profile === uploadProfile) ??
    S3_UPLOAD_PROFILE_OPTIONS[0];
  const uploadVisibility: StorageVisibility = selectedProfile.visibility;

  const columns = useMemo<TableColumn<StorageObjectRecord>[]>(
    () => [
      {
        key: "filename",
        title: "File",
        render: (row) => (
          <div className="min-w-52">
            <div className="break-all font-medium text-content-primary">{row.originalFilename}</div>
            <div className="mt-1 break-all font-mono text-xs text-content-tertiary">
              {row.objectKey}
            </div>
            {row.accessUrl && (
              <a
                className="mt-1 block break-all text-xs text-primary hover:underline"
                href={row.accessUrl}
                target="_blank"
                rel="noreferrer"
              >
                {row.accessUrl}
              </a>
            )}
          </div>
        ),
      },
      {
        key: "size",
        title: "Size",
        width: 120,
        render: (row) => formatBytes(row.sizeBytes),
      },
      {
        key: "type",
        title: "Type",
        width: 180,
        render: (row) => (
          <div className="space-y-1">
            <span className="break-all text-content-secondary">{row.contentType}</span>
            <Badge tone={row.visibility === "PUBLIC" ? "success" : "neutral"}>
              {row.visibility === "PUBLIC" ? "Public" : "Private"}
            </Badge>
          </div>
        ),
      },
      {
        key: "uploaded",
        title: "Uploaded",
        width: 210,
        render: (row) => (
          <div>
            <div>{formatDate(row.uploadedAt)}</div>
            <div className="mt-1 text-xs text-content-tertiary">{row.uploadedBy}</div>
          </div>
        ),
      },
      {
        key: "actions",
        title: "",
        width: 96,
        align: "right",
        render: (row) => (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            title="Download"
            loading={downloadingId === row.id}
            onClick={() => downloadRecord(row)}
          >
            <Download size={14} />
          </Button>
        ),
      },
    ],
    [downloadingId],
  );

  async function loadRecords() {
    setIsLoadingRecords(true);
    try {
      const response = await request.get<StorageObjectRecord[]>("/api/storage/uploads");
      setRecords(response.data);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setIsLoadingRecords(false);
    }
  }

  async function completeBrowserUpload(
    fileToComplete: File,
    result: {
      objectKey: string;
      contentType: string;
      etag?: string;
    },
    contentHash: string,
    profile: S3UploadProfile,
  ) {
    const response = await request.post<StorageObjectRecord>("/api/storage/uploads/complete", {
      objectKey: result.objectKey,
      originalFilename: fileToComplete.name,
      contentType: result.contentType,
      sizeBytes: fileToComplete.size,
      contentHash,
      uploadProfile: profile,
      etag: result.etag,
    });

    return response.data;
  }

  async function handleUpload() {
    if (!file || isBusy) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setState("creating-session");
    setError(null);
    setProgress(0);
    setIsMultipart(false);

    try {
      let record: StorageObjectRecord;
      setState("hashing");
      const contentHash = await calculateFileSha256(file, abortController.signal);

      setState("checking-duplicate");
      const duplicateResponse = await request.get<DuplicateStorageObjectResponse>(
        "/api/storage/uploads/duplicate",
        {
          query: {
            contentHash,
            sizeBytes: file.size,
            uploadProfile,
          },
          signal: abortController.signal,
        },
      );
      if (duplicateResponse.data.record) {
        record = duplicateResponse.data.record;
        setProgress(100);
        setRecords((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
        setState("done");
        return;
      }

      if (file.size <= SERVER_S3_UPLOAD_THRESHOLD_BYTES) {
        setState("server-uploading");
        record = await uploadFileThroughServer(file, uploadProfile, abortController.signal);
      } else {
        const response = await request.post<S3UploadSession>(
          "/api/storage/s3-upload-session",
          {
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            uploadProfile,
            contentHash,
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

        setState("finalizing");
        record = await completeBrowserUpload(file, result, contentHash, uploadProfile);
      }

      setProgress(100);
      setRecords((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
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

  async function downloadRecord(record: StorageObjectRecord) {
    setDownloadingId(record.id);
    setError(null);
    try {
      const response = await request.get<S3DownloadUrlResponse>(
        `/api/storage/uploads/${record.id}/download`,
      );
      window.location.assign(response.data.url);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setDownloadingId(null);
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>S3 Upload</CardTitle>
          <CardDescription>
            Files up to 5 MB upload through the server. Larger files upload directly to S3.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                className="md:col-span-2"
                type="file"
                accept={uploadVisibility === "PUBLIC" ? "image/*" : undefined}
                disabled={isBusy}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError(null);
                  setProgress(0);
                  setState("idle");
                }}
              />
              <Select
                value={uploadProfile}
                onValueChange={(value) => setUploadProfile(value as S3UploadProfile)}
                disabled={isBusy}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{selectedProfile.profile}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {S3_UPLOAD_PROFILE_OPTIONS.map((profile) => (
                    <SelectItem key={profile.profile} value={profile.profile}>
                      {profile.profile}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Badge tone={uploadVisibility === "PUBLIC" ? "success" : "neutral"}>
                {selectedProfile.directory}
              </Badge>
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
              {state === "finalizing" && <Badge tone="warning">Finalizing</Badge>}
              {state === "hashing" && <Badge tone="warning">Hashing</Badge>}
              {state === "checking-duplicate" && <Badge tone="warning">Checking duplicate</Badge>}
            </div>

            {(isBusy || state === "done") && (
              <Progress value={progress} tone={state === "done" ? "success" : "info"} />
            )}

            {error && <p className="text-sm text-error">{error}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Uploaded Objects</CardTitle>
              <CardDescription>{records.length} active object(s)</CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={isLoadingRecords}
              iconLeft={<RefreshCw size={14} />}
              onClick={loadRecords}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table
            columns={columns}
            rows={records}
            rowKey={(row) => row.id}
            empty={isLoadingRecords ? "Loading uploads..." : "No uploaded objects."}
          />
        </CardContent>
      </Card>
    </div>
  );
}
