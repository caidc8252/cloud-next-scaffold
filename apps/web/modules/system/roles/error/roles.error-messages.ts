import "server-only";

import type { Locale } from "@cloud/i18n";
import { registerErrorMessages } from "@cloud/request/server";
import {
  ERR_ROLE_DELETE_ASSIGNED,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_NAME_SHORT,
  ERR_ROLE_NOT_FOUND,
  ERR_ROLE_UPDATE_BUILTIN,
} from "./roles.error-codes.ts";

type RolesErrorCode =
  | typeof ERR_ROLE_NOT_FOUND
  | typeof ERR_ROLE_NAME_SHORT
  | typeof ERR_ROLE_DELETE_BUILTIN
  | typeof ERR_ROLE_DELETE_ASSIGNED
  | typeof ERR_ROLE_UPDATE_BUILTIN;

const rolesErrorMessages = {
  en: {
    [ERR_ROLE_NOT_FOUND]: "Role not found.",
    [ERR_ROLE_NAME_SHORT]: "The role name is too short.",
    [ERR_ROLE_DELETE_BUILTIN]: "Built-in roles cannot be deleted.",
    [ERR_ROLE_DELETE_ASSIGNED]: "Roles with assigned users cannot be deleted.",
    [ERR_ROLE_UPDATE_BUILTIN]: "Built-in roles cannot be modified.",
  },
  "zh-CN": {
    [ERR_ROLE_NOT_FOUND]: "角色不存在。",
    [ERR_ROLE_NAME_SHORT]: "角色名称太短。",
    [ERR_ROLE_DELETE_BUILTIN]: "内置角色不可删除。",
    [ERR_ROLE_DELETE_ASSIGNED]: "已分配用户的角色不可删除。",
    [ERR_ROLE_UPDATE_BUILTIN]: "内置角色不可修改。",
  },
  ja: {
    [ERR_ROLE_NOT_FOUND]: "ロールが見つかりません。",
    [ERR_ROLE_NAME_SHORT]: "ロール名が短すぎます。",
    [ERR_ROLE_DELETE_BUILTIN]: "組み込みロールは削除できません。",
    [ERR_ROLE_DELETE_ASSIGNED]: "ユーザーが割り当てられているロールは削除できません。",
    [ERR_ROLE_UPDATE_BUILTIN]: "組み込みロールは変更できません。",
  },
} satisfies Record<Locale, Record<RolesErrorCode, string>>;

registerErrorMessages(rolesErrorMessages);
