import "server-only";

import { randomBytes } from "node:crypto";
import { kv } from "@cloud/cache";

// sid + Redis 会话快照存储。
// cookie 只放不可猜的随机 sid（凭证 = 256-bit 随机 + 必须在 Redis 命中）；
// 快照本体存 Redis，滑动 TTL，过期即失效。cookie 写入由 actions.ts 负责。
//
// 快照结构对齐设计稿（PARTNER 用代码库的 entity 命名）：一份快照持有用户
// 全部可切换公司 entities[]，currentEntityId 指向当前公司，currentPermissions
// 是当前公司已收敛的有效权限码（切公司时重算）。

export const SID_COOKIE = "sid";
/** Redis 会话存活时长（秒），命中后滑动续期。 */
export const SESSION_TTL_SECONDS = 1800;
/** sid cookie 的最长存活（秒）。比 Redis TTL 长，空闲超 TTL 即失效需重登。 */
export const SID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

export type SessionRole = {
  roleId: number;
  roleName: string;
  roleType: string;
};

/** 公司切换列表里的轻量条目（用户可访问的每个公司）。 */
export type SessionEntityRef = {
  entityId: number;
  entityName: string;
  authorizingType: "ADMIN" | "NORMAL";
  status: string;
  authorizingFrom: string | null;
  authorizingTo: string | null;
};

/** 当前所选公司的完整上下文：契约 / 角色 / 已收敛的有效权限码。 */
export type CurrentEntity = {
  entityId: number;
  entityName: string;
  contractTypes: string[];
  authorizingType: "ADMIN" | "NORMAL";
  roles: SessionRole[];
  permissions: string[]; // 切公司时按契约 + 角色/ADMIN 重算
};

export type Session = {
  userId: number;
  // 身份（UI / 顶栏需要）
  username: string;
  displayName: string | null;
  email: string | null;
  // 当前公司：指针 + 完整上下文（未选公司时均为 null = partial 态）
  currentEntityId: number | null;
  currentEntity: CurrentEntity | null;
  // 可切换的公司列表
  entities: SessionEntityRef[];
  // 会话元信息
  loginAt: number;
  expireAt: number; // 近似值；Redis TTL 才是真正的过期权威
  mfaPassed: boolean;
};

const sessionKey = (sid: string) => `session:${sid}`;
const generateSid = () => randomBytes(32).toString("base64url");
const computeExpireAt = () => Date.now() + SESSION_TTL_SECONDS * 1000;

export const sessionStore = {
  /** 新建会话，自动盖 loginAt / expireAt，返回随机 sid。调用方负责写 cookie。 */
  async create(snapshot: Omit<Session, "loginAt" | "expireAt">): Promise<{ sid: string }> {
    const sid = generateSid();
    const session: Session = { ...snapshot, loginAt: Date.now(), expireAt: computeExpireAt() };
    await kv.set(sessionKey(sid), session, SESSION_TTL_SECONDS);
    return { sid };
  },
  /** 覆盖既有 sid 的会话（选公司 / 退公司重算）；loginAt 由调用方原样带回，expireAt 刷新。 */
  async update(sid: string, snapshot: Omit<Session, "expireAt">): Promise<void> {
    const session: Session = { ...snapshot, expireAt: computeExpireAt() };
    await kv.set(sessionKey(sid), session, SESSION_TTL_SECONDS);
  },
  /** 读会话；未命中 / 已过期返回 null。 */
  read(sid: string): Promise<Session | null> {
    return kv.get<Session>(sessionKey(sid));
  },
  /** 滑动续期。命中后调用。 */
  touch(sid: string): Promise<void> {
    return kv.expire(sessionKey(sid), SESSION_TTL_SECONDS);
  },
  /** 销毁会话（登出）。 */
  destroy(sid: string): Promise<void> {
    return kv.del(sessionKey(sid));
  },
};
