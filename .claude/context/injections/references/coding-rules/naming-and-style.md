# Naming & style

- **TypeScript with real types.** No `any`. Express contracts through the type system — do NOT write JSDoc for types. Do not modify `packages/*` unless the task explicitly calls for it.
- **Casing:** variables/functions `camelCase`; types/classes/interfaces `PascalCase`; top-level constants `UPPER_SNAKE_CASE`; files/directories `kebab-case`. Booleans start `is` / `has` / `can`; functions read as verbs (or verb-object), classes as nouns. Avoid non-standard abbreviations.
- **File size:** aim ~300 lines, hard cap 400 for any single component / library / script. Split before crossing it.
- **Comment intent, not surface.** Explain business meaning, architecture boundaries, compat shells, migration reasons, and safety trade-offs; don't restate what the code plainly says.

### Constants & enums (absorbed from the constants rule; deep spec in the See-also)

- **Only lazy values go in `constants`** — import-and-read, no behavior. Anything with behavior (validation / generation / context-dependent computation) is a *capability* and belongs in its own package (e.g. menus/permissions/roles are the CoC subsystem `@cloud/platform-config`, not constants).
- **Placement:** code-sourced value shared across apps → `packages/constants`; single-app only → `apps/*/lib/constants`. Env-sourced values are NOT constants → `@cloud/config` (see [env-config](env-config.md)).
- **Organize constant files by domain** (`country.ts` / `status.ts` / `device.ts`), never by "fixed enum vs adjustable param" — that axis is subjective and churns; a static tunable is still a const (changing it is a redeploy, same as an enum).
- **Constant naming:** top-level export `UPPER_SNAKE_CASE` (`PASSWORD_POLICY`); object fields `camelCase` (`minLength`); booleans `is` / `has` / `can` / `enable` + positive wording (`enableMfa`, not `mfaDisabled`); string enum values crossing the DB boundary match the DB canonical form (e.g. ContractType all-caps + hyphen); money is integer minor units + currency, never float.
- **Keep a cohesive concept as one typed object**, not N scattered constants — `PASSWORD_POLICY` renders whole, serializes whole, carries a `PasswordPolicy` type. Pluck single values at the edge (`export const PW_MIN = PASSWORD_POLICY.minLength;`). Don't over-split for tidiness.
- **Cross-cutting (shared with env-config):** single source of truth — one value defined once, never copy a default across layers; no magic numbers/strings downstream (name `60 * 60 * 1000`); dimensioned values (time / bytes / money / percent) carry the unit in the name.

See also (deep spec): `.claude/docs/constants.md` (constant / enum conventions).
