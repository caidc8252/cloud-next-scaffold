# Domain model

Ground facts (not code mechanics) for tenancy, contracts, roles, and left-menu computation.

## Party (tenant)

- A **Party** is one company = one tenant. Every user — administrators included — belongs to a Party.
- Party rows persist in the DB (data-model space); read attributes from there, never invent them. All business data access is scoped per Party (see [party-scoping](party-scoping.md)).

## Contract types

- A Party MAY hold several **contracts**. The **contract type** is hardcoded in `manifest/catalog/contract-types.ts` — NOT stored in the DB.
- Known types: `US-ISV`, `US-ISO`, `ADMIN`, `MERCHANT`.
  - **`ADMIN` is a platform-wide singleton** — exactly one company may hold the `ADMIN` contract.
- **Contract ↔ menu is many-to-many**: a contract unlocks many menus (modules); a menu may be unlocked by many contracts. Encoded in `CONTRACT_MENUS` (no wildcard — every contract enumerates its menus explicitly).
- AI adds a new contract type ONLY on an explicit, clearly described business need; when unsure, ask the operator.

## Roles

- Preset (GLOBAL) roles are hardcoded in `manifest/catalog/roles.ts`; `roleId` in `1–500`, unique. Attributes: `roleId`; `description` (drives AI permission recommendation); `permissions` (the codes it grants).
- Roles are human-maintained. After finishing a module, AI MAY propose which new permissions belong to which role (inferred from each role's `description`) but merges ONLY **after operator authorization**. Role-id ranges & GLOBAL/PRIVATE split: [auth-guards](auth-guards.md).

## Effective-permission derivation

The left menu is computed at company-switch, never hardwired:

1. User logs in → selects a Party.
2. The Party's **contracts** × the user's **roles** = effective permissions; contract scope is the outer gate, roles narrow within it.
3. Permitted leaves **project** into the menu tree: a visible leaf pulls in its ancestor dirs, empty dirs are pruned.

The `ADMIN` type gets the whole contract scope (bypasses roles, still inside the contract gate). Concrete mechanics: [auth-guards](auth-guards.md) effective-permission model; menu declaration: [coc-declaration](coc-declaration.md).
