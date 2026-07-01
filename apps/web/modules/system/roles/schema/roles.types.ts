// apps/admin/service/roles/types.ts
// 角色域展示 VO（服务端 mapper 输出，client 取数即得）。
export type Role = {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  operatorCount: number;
  permissions: string[];
  updatedAt: string;
  updatedBy: string;
};
