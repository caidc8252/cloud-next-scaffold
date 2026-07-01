export type PatchResult =
  | { kind: 'patched'; file: string; detail: string }
  | { kind: 'noop'; file: string; reason: string }
  | { kind: 'manual'; file: string; reason: string; instructions: string };

export interface SetupSummary {
  filesWritten: string[];
  patches: Array<{ file: string; status: PatchResult['kind']; detail: string }>;
  verifyHint: string;
}
