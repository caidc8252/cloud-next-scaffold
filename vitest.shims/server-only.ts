// vitest stub for `server-only` — the real package throws at module load to enforce
// server-bundle isolation. In tests we don't care; tests run in Node so server modules
// are safe to import directly.
export {};
