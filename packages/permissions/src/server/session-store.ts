import "server-only";

import { kv } from "@cloud/cache";
import { generateToken } from "@cloud/security/token";

// sid + Redis 会话快照存储。
// cookie 只放不可猜的随机 sid（凭证 = 256-bit 随机 + 必须在 Redis 命中）；
// 快照本体存 Redis，滑动 TTL，过期即失效。cookie 写入由 actions.ts 负责。
//
// 快照是单一扁平形状（storage == consumption）：身份 + 当前公司字段平铺在顶层
// （partyName / contractTypes / roles / permissions）+ 可切换列表 partners[]。
// 未选公司（partial）时 currentPartyId 为 null、当前公司字段为空。

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
export type SessionPartyRef = {
  partyId: number;
  partyName: string;
  authorizingType: "ADMIN" | "NORMAL";
  status: string;
  authorizingFrom: string | null;
  authorizingTo: string | null;
};

export type Session = {
  userId: number;
  // 身份（UI / 顶栏需要）；登录改 email 后不再有 username，身份显示用 displayName / email
  displayName: string | null;
  email: string | null;
  // 当前公司上下文（平铺；未选公司时 currentPartyId=null、其余为空）
  currentPartyId: number | null;
  partyName: string | null;
  contractTypes: string[];
  authorizingType: "ADMIN" | "NORMAL" | null;
  roles: SessionRole[];
  permissions: string[]; // 切公司时按契约 + 角色/ADMIN 重算
  // 可切换的公司列表
  partners: SessionPartyRef[];
  // 会话元信息
  loginAt: number;
  expireAt: number; // 近似值；Redis TTL 才是真正的过期权威
  mfaPassed: boolean;
};

/** 已选定公司的会话：仅类型收窄，字段同 Session，不重命名/不重构。 */
export type ActiveSession = Session & {
  currentPartyId: number;
  partyName: string;
  authorizingType: "ADMIN" | "NORMAL";
};

const sessionKey = (sid: string) => `session:${sid}`;
const generateSid = () => generateToken();
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
