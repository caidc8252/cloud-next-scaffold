import { z } from 'zod'

export const ContractKind = z.enum(['export', 'composition', 'html', 'unknown'])
export type ContractKind = z.infer<typeof ContractKind>

export const Disposition = z.enum([
  'clean-export', 'clean-composition', 'html-decompose', 'partial-drift', 'unimplemented',
])
export type Disposition = z.infer<typeof Disposition>

export const ContractEntrySchema = z.object({
  contract: z.string(),
  primary: z.string().nullable(),
  children: z.array(z.string()),
  named: z.array(z.string()),
  kind: ContractKind,
})
export type ContractEntry = z.infer<typeof ContractEntrySchema>

// Checked-in, version-pinned. Contract facts ONLY — no disposition (that is
// consume-time, against live @cloud/ui exports). `contractHashes` is the drift
// manifest: relative-path -> sha256 of the source contract file.
export const ContractTableSchema = z.object({
  foundationVersion: z.string(),
  contractHashes: z.record(z.string()),
  byClass: z.record(ContractEntrySchema),
})
export type ContractTable = z.infer<typeof ContractTableSchema>

// Consume-time view: contract facts + disposition resolved against real exports.
export const ResolvedEntrySchema = ContractEntrySchema.extend({
  disposition: Disposition,
  missing: z.array(z.string()),
})
export type ResolvedEntry = z.infer<typeof ResolvedEntrySchema>

export const ResolvedTableSchema = z.object({
  foundationVersion: z.string(),
  byClass: z.record(ResolvedEntrySchema),
})
export type ResolvedTable = z.infer<typeof ResolvedTableSchema>

export const NodeBucket = z.enum([
  'clean-mapped', 'html-decompose', 'unimplemented', 'layout-residue', 'offcontract-unknown',
])
export type NodeBucket = z.infer<typeof NodeBucket>

export interface IRNode {
  id: number          // stable ordinal in document order
  line: number        // 1-indexed source line in the artifact
  tag: string         // lowercase HTML tag name
  classes: string[]   // raw class tokens
  bases: string[]     // class tokens reduced to BEM block (strip __/-- suffix)
  bucket: NodeBucket
  matchedClass: string | null
  component: string | null   // first @cloud/ui component name for the node
}

export interface RoundTrip {
  onContractNodes: number
  matchedInstances: number
  orphanInstances: number
  unmatchedNodes: number
  reliable: boolean
}

export interface GateResult {
  total: number
  buckets: Record<NodeBucket, number>
  roundTrip: RoundTrip
}

export interface BehaviorUnit {
  name: string
  startLine: number
  loc: number
  kind: 'absorbed' | 'custom'
  reason: string
}

export interface BehaviorReport {
  totalLoc: number
  absorbedLoc: number
  customLoc: number
  customFraction: number
  units: BehaviorUnit[]
}
