import { defineAppManifest } from "@cloud/platform-config";

// customer 平台的菜单 / 权限定义（COC 单一真源）。
// 当前 customer 不声明自有菜单：dashboard / system / users 等是 admin 侧的跨平台公共能力
// （contractTypes:[]），经 gen:manifest 全量并集后 customer 直接继承，无需重复声明。
// 仅保留 contractKeys（贡献全局契约枚举）；将来有 customer 专属页再在此加 menus。
export const appManifest = defineAppManifest({
  contractKeys: ["US-ISO", "US-ISV", "US-ISO-PILOT", "US-ISV-PILOT", "MERCHANT", "PLATFORM-CUSTOM"],
  menus: [],
});
