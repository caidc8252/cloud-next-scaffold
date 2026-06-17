import type { Role } from "./types";
import { PRESET_ROLE_ID_MAX } from "@cloud/platform-config";

// 死写 GLOBAL 角色（roleId ≤ 1000，含预留区间）的 name/description 是 coc i18n key，按 locale 翻译；
// DB 动态角色（≥1001）的 name/description 是用户字面量，原样保留。判据用 DB 边界 1000（非 builtin/300）。
// 在 RSC 页面边界调用（传入 getTranslations("coc") 的翻译器），把 VO 变成展示就绪。
export function translateRoleLabels(roles: Role[], tc: (key: string) => string): Role[] {
  return roles.map((r) =>
    Number(r.id) <= PRESET_ROLE_ID_MAX ? { ...r, name: tc(r.name), description: r.description ? tc(r.description) : "" } : r,
  );
}
