import { defineMenuTree } from "@cloud/platform-config";

// 侧边栏目录骨架。目录节点无 path / permissions / contractTypes。
// home/dashboard 是 B 类(登录即看,layout 直链),不进 CoC 骨架。
// 在 manifest/catalog/i18n json 的 menu 节点 中做国际化
export default defineMenuTree([
  // platform:骨架根节点,默认菜单挂载点。title 由 menuCode 派生(menu.platform)。
  { menuCode: "platform", parentMenuCode: null, icon: "layout-grid", order: 1 },
  { menuCode: "system", parentMenuCode: null, icon: "settings", order: 100 },
]);
