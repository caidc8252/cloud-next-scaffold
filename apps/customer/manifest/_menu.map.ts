import { defineAppManifest } from "@cloud/platform-config";

// customer 平台的菜单 / 权限定义（COC 单一真源）。
// menuCode / permissionCode 全局唯一，不得与 admin 平台冲突（故 menuCode 用 c- 前缀）。
// 契约门控只发生在 menu.contractTypes；role 不再与 contract 关联（见 docs/design-bridge/portal/logic.md）。
export const appManifest = defineAppManifest({
  // customer 平台面向的契约类型（目标 7 值里的 customer 侧；admin 侧的 ADMIN 不在此）。
  contractKeys: ["US-ISO", "US-ISV", "US-ISO-PILOT", "US-ISV-PILOT", "MERCHANT", "PLATFORM-CUSTOM"],
  menus: [
    { menuCode: "c-home", menuTitle: "Home", parentMenuCode: null, path: null, contractTypes: ["US-ISO", "US-ISV", "US-ISO-PILOT", "US-ISV-PILOT", "PLATFORM-CUSTOM"], order: 1 },
    {
      menuCode: "c-overview",
      menuTitle: "Overview",
      parentMenuCode: "c-home",
      path: "/overview",
      icon: "layout-dashboard",
      contractTypes: ["US-ISO", "US-ISV", "US-ISO-PILOT", "US-ISV-PILOT", "PLATFORM-CUSTOM"],
      order: 2,
      permissions: [{ code: "overview:view", label: "View Overview", desc: "View customer console overview" }],
    },
  ],
});
