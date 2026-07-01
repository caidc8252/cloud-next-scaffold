// Consumer-owned. Extra tables to preserve across truncateAll(), merged additively with
// the kit DEFAULT_KEEP. Add a table here if a spec relies on its rows surviving truncation
// (e.g. a DB role row, sys_role, for an author-seeded ≥1001 role). Safe to edit; the
// installer writes this only if absent.
export const KEEP_LOCAL: string[] = [];
