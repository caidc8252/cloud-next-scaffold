// apps/admin/service/users/api.ts
// 用户域客户端调用出口：具名函数、全量路径；请求类型同源于 ./schemas，响应 VO 同源于 ./types。
import { request } from "@cloud/request/client";
import type { User } from "./types";
import type { CreateInviteInput, UpdateUserInput, SetInviteRolesInput } from "./schemas/users.schema";

export const listUser = () => request.get<User[]>("/api/system/users");

export const createUser = (input: CreateInviteInput) =>
  request.post<User>("/api/system/users", input);

export const updateUser = (id: string, input: UpdateUserInput) =>
  request.put<User>(`/api/system/users/${id}`, input);

export const setUserInviteRoles = (id: string, input: SetInviteRolesInput) =>
  request.put<User>(`/api/system/users/${id}/invite-roles`, input);

export const lockUser = (id: string) =>
  request.post<User>(`/api/system/users/${id}/lock`);

export const resetUserPassword = (id: string) =>
  request.post<User>(`/api/system/users/${id}/reset-password`);

export const cancelUserInvite = (id: string) =>
  request.post(`/api/system/users/${id}/cancel-invite`);

export const resendUserInvite = (id: string) =>
  request.post<User>(`/api/system/users/${id}/resend-invite`);

export const regenerateUserInvite = (id: string) =>
  request.post<User>(`/api/system/users/${id}/regenerate-invite`);
