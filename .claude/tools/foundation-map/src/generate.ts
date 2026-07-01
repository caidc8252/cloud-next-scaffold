import type { ContractTable } from './types'
import { buildContractTable } from './build-table'
import { hashContracts } from './hash'

export function generateTable(contractsDirs: string[], foundationVersion: string): ContractTable {
  return buildContractTable(contractsDirs, foundationVersion, hashContracts(contractsDirs))
}
