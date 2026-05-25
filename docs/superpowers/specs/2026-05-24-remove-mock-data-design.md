# 移除 packages/system mock 数据

## 目标

将 `packages/system/src/mock/` 中的硬编码数据全部替换为数据库查询或配置，然后删除 mock 目录。

## 涉及的 mock 数据

| Mock 文件 | 当前消费方 | 替换方案 |
|---|---|---|
| `permission-catalog.ts` | `role-editor.tsx`, `helpers.ts` | 从 `SysPermission` + `SysMenu` 查询 |
| `menu-tree.ts` | `helpers.ts` | 从 `SysMenu` 查询 |
| `password-policy.ts` | `user-detail.tsx` | 移到 `@cloud/config` |

## 变更清单

### 1. Schema: SysPermission 加 label 字段

- `packages/db/prisma/schema.prisma` 中 `SysPermission` 新增 `label String? @map("label") @db.VarChar(100)`
- 生成 migration
- `packages/db/prisma/seed.ts` 中为每条 permission 补上 label 值（来源：当前 mock 中的 label）

对应关系：

| permissionCode | label |
|---|---|
| roles.VIEW | View Roles |
| roles.ADD | Create Role |
| roles.UPD | Edit Role |
| roles.DELETE | Delete Role |
| roles.DUPLICATE | Duplicate Role |
| users.VIEW | View Users |
| users.ADD | Create User |
| users.INVITE | Invite User |
| users.UPD | Edit User |
| users.LOCK | Lock/Unlock User |
| users.RESETPW | Reset Password |
| users.CHANGE_ROLE | Change Role |

### 2. 重构 helpers.ts

`permissionGroupsForContract` 和 `permAppliesToContract` 改为接收参数：

```ts
type PermissionWithMenu = {
  code: string;
  label: string;
  desc: string;
  menuId: number;
  menuTitle: string;
  contractDefineCode: string;
};

function permissionGroupsForContract(
  permissions: PermissionWithMenu[],
  contractDefineCode: string
): PermissionGroup[]

function permAppliesToContract(
  permissions: PermissionWithMenu[],
  permCode: string,
  contractDefineCode: string
): boolean
```

不再 import mock，数据由调用方传入。

### 3. 重构角色编辑组件

- `PermissionsCard` 增加 prop 接收完整的权限目录数据
- `RoleEditor` 增加 prop 接收权限目录，替代 `PERMISSION_CATALOG` 的 `toggleGroup` 用法
- 服务端页面查询 `SysPermission`（include `menu`），组装后传给客户端组件

### 4. PASSWORD_POLICY 移到 @cloud/config

在 `packages/config` 中导出密码策略常量：

```ts
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
  maxErrorTimes: 5,
  lockDurationMinutes: 30,
  historySize: 5,
  expiryDays: 90,
} as const;
```

`user-detail.tsx` 改为从 `@cloud/config` 导入。

### 5. 清理

- 删除 `packages/system/src/mock/` 整个目录
- 清理 `packages/system/src/types.ts` 中不再需要的 `MenuNode` 类型
- `PermissionEntry` 类型调整为匹配新的数据结构（或替换为 `PermissionWithMenu`）
- 更新 `helpers.test.ts` 测试用例适配参数化接口
- `PasswordPolicy` 类型移到 `@cloud/config` 或保留在 system 中从 config 引用

## 不做的事

- 不改动侧边栏菜单加载逻辑（`auth.ts` 中已经走数据库）
- 不新建密码策略表（策略稳定，配置常量足够）
- 不改动 `SysMenu` 表结构
