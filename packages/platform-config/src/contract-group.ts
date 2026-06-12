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
