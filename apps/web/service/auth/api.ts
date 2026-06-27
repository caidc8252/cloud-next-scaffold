// apps/admin/service/auth/api.ts
// auth 域客户端调用出口：具名函数、全量路径；请求类型同源于 ./schemas。
import { request } from "@cloud/request/client";
import type { SelectPartnerInput } from "./schemas/auth.schema";

export const getServerTime = () =>
  request.get<{ serverTimestamp: number }>("/api/auth/server-time");

export const selectPartner = (input: SelectPartnerInput) =>
  request.post("/api/auth/select-partner", input);
