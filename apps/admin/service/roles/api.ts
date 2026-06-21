// apps/admin/service/roles/api.ts
// 角色域客户端调用出口：具名函数、全量路径；请求类型同源于 ./schemas，响应 VO 同源于 ./types。
import { request } from "@cloud/request/client";
import type { Role } from "./types";
import type { CreateRoleInput, UpdateRoleInput } from "./schemas/roles.schema";

export const createRole = (input: CreateRoleInput) =>
  request.post<Role>("/api/system/roles", input);

export const updateRole = (id: string, input: UpdateRoleInput) =>
  request.put<Role>(`/api/system/roles/${id}`, input);

export const deleteRole = (id: string) =>
  request.delete(`/api/system/roles/${id}`);
