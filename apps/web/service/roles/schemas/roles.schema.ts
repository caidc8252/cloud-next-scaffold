import { z } from "zod";

// 角色域共享入参校验。client 表单与 route 共用；route 负责把解析失败映射成稳定 error code。

const permissionsField = z.array(z.string()).optional();

/** POST /api/system/roles —— 新建角色。名称沿用历史的最短 2 字符约束。 */
export const createRoleSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().optional(),
  permissions: permissionsField,
});

/** PUT /api/system/roles/[roleId] —— 更新角色（内置角色仅权限可改，名称/描述由 service 忽略）。 */
export const updateRoleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  permissions: permissionsField,
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
