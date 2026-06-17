// 契约类型 → portal 组 的**单一真源**。角色区间过滤 + portalUrl 路由共用，避免两处映射漂移。
// 不变量：禁止一个 party 的契约跨组重叠（契约创建时在应用层强制）。
// 跨组脏数据兜底优先级：ADMIN > CUSTOMER > MERCHANT（正常一个 party 不跨组）。

export type PortalGroup = "ADMIN" | "CUSTOMER" | "MERCHANT";

const CONTRACT_TYPE_GROUP: Record<string, PortalGroup> = {
  ADMIN: "ADMIN",
  "US-ISO": "CUSTOMER",
  "US-ISV": "CUSTOMER",
  "US-ISO-PILOT": "CUSTOMER",
  "US-ISV-PILOT": "CUSTOMER",
  "PLATFORM-CUSTOM": "CUSTOMER",
  MERCHANT: "MERCHANT",
};

/** 死写 GLOBAL 角色按组的 roleId 区间：admin 1–100 / customer 101–200 / merchant 201–300。 */
export const GROUP_ROLE_ID_RANGE: Record<PortalGroup, [number, number]> = {
  ADMIN: [1, 100],
  CUSTOMER: [101, 200],
  MERCHANT: [201, 300],
};

// 角色 ID 空间（预置 GLOBAL vs DB 动态 PRIVATE）的单一真源——替代散落各处的 1000/300/1001 魔法数。
/** 预置/GLOBAL 角色 ID 上界：≤ 此即预置（不入库、内置只读、coc i18n 名）。1–300 当前分配在用、301–1000 预留缓冲。 */
export const PRESET_ROLE_ID_MAX = 1000;
/** 死写角色当前允许分配的上界（= GROUP_ROLE_ID_RANGE 上界 300）：manifest 校验只接受 1–此 的 roleId。 */
export const PRESET_ROLE_ID_ALLOCATION_MAX = 300;
/** DB 动态 PRIVATE 角色 ID 起点（DB 自增从此开始）。 */
export const DB_ROLE_ID_MIN = PRESET_ROLE_ID_MAX + 1;

const GROUP_PRIORITY: PortalGroup[] = ["ADMIN", "CUSTOMER", "MERCHANT"];

/** 单个契约类型 → 组（未知类型 → null）。 */
export function contractTypeGroup(contractType: string): PortalGroup | null {
  return CONTRACT_TYPE_GROUP[contractType] ?? null;
}

/** 一组契约类型 → 唯一 portal 组。正常无跨组；跨组脏数据按 ADMIN>CUSTOMER>MERCHANT 取一；无可识别 → null。 */
export function resolvePortalGroup(contractTypes: readonly string[]): PortalGroup | null {
  const groups = new Set(
    contractTypes.map(contractTypeGroup).filter((g): g is PortalGroup => g !== null),
  );
  return GROUP_PRIORITY.find((g) => groups.has(g)) ?? null;
}

/** roleId 是否落在某组的死写区间。 */
export function roleIdInGroupRange(roleId: number, group: PortalGroup): boolean {
  const [min, max] = GROUP_ROLE_ID_RANGE[group];
  return roleId >= min && roleId <= max;
}

// 预置（通配）管理员角色：命中时由会话 / 列表注入所在 party 的 scope（即该 party 在其组内的全部能力）。
// 取各组 roleId 区间的基准值；merchant（201）暂不启用，启用时把它加进来即可。
const PRESET_ADMIN_ROLE_IDS = new Set<number>([1, 101]);

/** 是否为预置（通配）管理员角色（ADMIN→1 / CUSTOMER→101；merchant 201 缓做）。 */
export function isPresetAdminRole(roleId: number): boolean {
  return PRESET_ADMIN_ROLE_IDS.has(roleId);
}
