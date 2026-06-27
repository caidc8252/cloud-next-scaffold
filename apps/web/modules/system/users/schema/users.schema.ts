import { z } from "zod";

// 用户域共享入参校验。client 表单与 route 共用同一份；route 负责把解析失败映射成稳定 error code。
// 角色 id 原始入参（string/number 混入）的去重/收窄交给 service 调 parseRoleIds，schema 只保证
// 「是数组」，沿用历史的宽松过滤语义（非法元素被丢弃而非整体 400）。

const roleIdsInput = z.array(z.union([z.string(), z.number()]));

/** 同邮箱正则保持历史行为：非空、单个 @、域名带点。 */
const emailField = z
  .string()
  .trim()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

/** POST /api/system/users —— 邀请运营人员。 */
export const createInviteSchema = z.object({
  email: emailField,
  roleIds: roleIdsInput.optional(),
});

/** PUT /api/system/users/[userId] —— remark 与/或角色更新（roleIds 省略表示不动角色）。 */
export const updateUserSchema = z.object({
  remark: z.string().optional(),
  roleIds: roleIdsInput.optional(),
});

/** PUT /api/system/users/[userId]/invite-roles —— 待消费邀请的预分配角色。 */
export const setInviteRolesSchema = z.object({
  roleIds: roleIdsInput.optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SetInviteRolesInput = z.infer<typeof setInviteRolesSchema>;
