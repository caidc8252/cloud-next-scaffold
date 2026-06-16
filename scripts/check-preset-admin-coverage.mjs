// Non-blocking coverage check: warns when a preset super-admin's explicit
// permissionCodes don't cover all codes reachable in its group. Never fails the build.
// Run via `pnpm check:roles` (also tail-called from gen:manifest, warn-only).
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  isPresetAdminRole,
  contractTypeGroup,
  GROUP_ROLE_ID_RANGE,
  roleIdInGroupRange,
} from "@cloud/platform-config";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = join(root, "apps");
const apps = readdirSync(appsDir).filter((n) => statSync(join(appsDir, n)).isDirectory());

const manifests = [];
const roles = [];
for (const name of apps) {
  const menuFile = join(appsDir, name, "manifest", "_menu.map.ts");
  if (existsSync(menuFile)) manifests.push((await import(pathToFileURL(menuFile).href)).appManifest);
  const roleFile = join(appsDir, name, "manifest", "_roles.map.ts");
  if (existsSync(roleFile)) roles.push(...((await import(pathToFileURL(roleFile).href)).appRoles ?? []));
}
const menus = manifests.flatMap((m) => m.menus ?? []);
const contractKeys = [...new Set(manifests.flatMap((m) => m.contractKeys ?? []))];

const groups = Object.keys(GROUP_ROLE_ID_RANGE);
// 命中契约的菜单声明的全部权限码（[] = 通用，对所有契约命中）。
const codesForContracts = (cts) =>
  menus
    .filter((m) => m.contractTypes.length === 0 || m.contractTypes.some((c) => cts.includes(c)))
    .flatMap((m) => (m.permissions ?? []).map((p) => p.code));

let warnings = 0;
for (const r of roles) {
  if (!isPresetAdminRole(r.roleId)) continue;
  const group = groups.find((g) => roleIdInGroupRange(r.roleId, g));
  if (!group) continue;
  const groupContracts = contractKeys.filter((ct) => contractTypeGroup(ct) === group);
  const expected = new Set(codesForContracts(groupContracts));
  const have = new Set(r.permissionCodes);
  const missing = [...expected].filter((c) => !have.has(c));
  if (missing.length) {
    warnings++;
    console.warn(
      `[check:roles] WARN preset-admin roleId ${r.roleId} ("${r.roleName}") missing ${missing.length} code(s): ${missing.join(", ")}`,
    );
  }
}
if (warnings === 0) console.log("[check:roles] OK — all preset super-admins cover their group scope.");
process.exit(0);
