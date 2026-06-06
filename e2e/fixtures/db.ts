// Use the kit's shared singleton — the runtime client lives at @cloud/db, and
// the eslint preset forbids instantiating the client directly or importing it
// at runtime from the generated package. DATABASE_URL (from .env.test, loaded
// in playwright.config.ts) must point at the test Postgres before this module
// is first imported.
import { prisma } from '@cloud/db';

// Truncate every public table except _prisma_migrations before each test.
// RESTART IDENTITY CASCADE so serial PKs reset and FKs don't block.
export async function truncateAll(): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) return;
  const list = rows.map(r => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export { prisma };
