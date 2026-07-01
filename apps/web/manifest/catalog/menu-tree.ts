import { defineMenuTree } from "@cloud/platform-config";

// 侧边栏目录骨架。目录节点无 path / permissions / contractTypes。
// home/dashboard 是 B 类(登录即看,layout 直链),不进 CoC 骨架。
// 在 manifest/catalog/i18n json 的 menu 节点 中做国际化
export default defineMenuTree([
  // L1 节点 和 L2 挂载示例
  // { menuCode: "level1Node",  parentMenuCode: null, icon: "settings", order: 50 },
  // { menuCode: "level2Node", parentMenuCode: level1Node, icon: "package", order: 10 },
  // platform: 骨架根节点,默认菜单挂载点。
  { menuCode: "platform", title: "menu.platformMain", parentMenuCode: null, icon: "layout-grid", order: 1 },
  { menuCode: "system", title: "menu.system", parentMenuCode: null, icon: "settings", order: 100 },
]);
