# Database conventions

Schema lives in `packages/db/prisma/schema.prisma`; regenerate the client with `pnpm db:generate` after edits.

**Party isolation (iron law #7).**
- Every business table MUST carry `partyId Int @map("party_id")` and an index on it (`@@index([partyId])`, or a composite like `@@index([partyId, status])`). See `SysPartyUser`, `SysNotice` (`belongToPartyId`, nullable for cross-party globals).
- Per-party uniqueness MUST be expressed as `@@unique([partyId, <key>])` — a bare unique on `<key>` collides across tenants. Example: `@@unique([partyId, userId], map: "uk_sys_party_user")`.
- The query-time discipline that fills these columns — scoping every read and write on session `currentPartyId` — is in [party-scoping](party-scoping.md).

**Naming.** Keep key names identical across tables when they mean the same thing (no ambiguous duplication). Prisma fields are camelCase, columns snake_case via `@map` (`partyId → party_id`). Follow [naming-and-style](naming-and-style.md).

**JSONB vs join table.** Prefer a JSONB array of ids over a generic join table when the relation is **read-heavy, has a clear aggregate entry point, and is rarely reverse-queried** (e.g. `permissionCodes`, `roles`, `intendedRole` are `Json @default("[]")`). If you need frequent reverse lookups, dedup, or FK integrity, use a real relation/table instead — evaluate the index/query cost in the owning business domain.

**File-info fields.** Express file references as ordinary business-table columns, not a generic files table — a single `objectUrl` for public images, or the full S3 object (`bucket`, `regionId`, `objectKey`, `objectUrl`, `contentType`, `sizeBytes`, `etag`, `lastModified`) plus business fields (`originalFilename` / `contentHash` / `visibility`). Multiple files go in a JSONB array whose **order is the display order**.
- **MUST NOT persist file info until the service layer has validated it** (permission, ownership, type, visibility, S3 `HeadObject`) — see [storage](storage.md).

Generated artifacts (`packages/db/generated/*`, `manifest/_generated/*`) are never hand-edited.
