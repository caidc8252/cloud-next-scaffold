import { defineMenuTree } from "@cloud/platform-config";

// 侧边栏目录骨架。目录节点无 path / permissions / contractTypes。
// home/dashboard 是 B 类(登录即看,layout 直链),不进 CoC 骨架。
export default defineMenuTree([
  { menuCode: "system", title: "menu.system", parentMenuCode: null, icon: "settings", order: 100 },
]);
