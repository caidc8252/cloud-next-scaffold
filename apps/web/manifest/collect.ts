import menuTree from "./catalog/menu-tree.ts";
import { CONTRACT_TYPES, CONTRACT_MENUS } from "./catalog/contract-types.ts";
import { GLOBAL_ROLES } from "./catalog/roles.ts";

import systemRoles from "../modules/system/roles/manifest.ts";
import systemUsers from "../modules/system/users/manifest.ts";
import systemUsers from "../modules/system/users/manifest.ts";


// 采集入口(作者维护 import 串;provisional 自动扫描推迟到 Step 3)。codegen 读这一份。
export const collected = {
  modules: [systemRoles, systemUsers],
  menuTree,
  contractTypes: CONTRACT_TYPES,
  contractMenus: CONTRACT_MENUS, // 喂 guard:引用 menuCode 必须存在且是叶子
  globalRoles: GLOBAL_ROLES,     // 喂 guard:引用 code 必须存在
};
