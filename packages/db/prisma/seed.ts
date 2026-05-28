import { prisma } from "../src/index.ts";

// ─── Initial permission definitions ────────────────────
// label is auto-generated from code: "module.ACTION_NAME" → "Module Action Name"
function labelFromCode(code: string): string {
  const [module, action] = code.split(".");
  const fmt = (s: string) =>
    s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${fmt(module)} ${fmt(action ?? "")}`.trim();
}

type PermissionDef = { code: string; menuKey: string; remark: string };

const PERMISSIONS: PermissionDef[] = [
  // Dashboard
  { code: "dashboard:view", menuKey: "dashboard", remark: "View dashboard" },
  // Roles
  { code: "roles.VIEW", menuKey: "roles", remark: "View role list and details" },
  { code: "roles.ADD", menuKey: "roles", remark: "Create new role" },
  { code: "roles.UPD", menuKey: "roles", remark: "Edit role name, description, permissions" },
  { code: "roles.DELETE", menuKey: "roles", remark: "Delete non-builtin role" },
  { code: "roles.DUPLICATE", menuKey: "roles", remark: "Copy an existing role" },
  // Users
  { code: "users.VIEW", menuKey: "users", remark: "View user list and details" },
  { code: "users.ADD", menuKey: "users", remark: "Create user (direct mode)" },
  { code: "users.INVITE", menuKey: "users", remark: "Invite user (email mode, placeholder)" },
  { code: "users.UPD", menuKey: "users", remark: "Edit user display name, email, remark" },
  { code: "users.LOCK", menuKey: "users", remark: "Lock / unlock user account" },
  { code: "users.RESETPW", menuKey: "users", remark: "Force-reset user password" },
  { code: "users.CHANGE_ROLE", menuKey: "users", remark: "Change user's assigned role" },
];

const DEFAULT_PASSWORD = "ChangeMe!123";
const DEFAULT_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Ev3lJmDRsEa0Nbomhgn47A$1lT4/JCDbV5hT5+63bxLMZBMyUinbkuEiAko+NTT96g";

async function main() {
  // 1. Contract definitions
  const contractCodes = [
    { contractDefineCode: "ADMIN", contractName: "Platform Admin" },
    { contractDefineCode: "ISV", contractName: "Independent Software Vendor" },
    { contractDefineCode: "ISO", contractName: "Independent Sales Organization" },
    { contractDefineCode: "MERCHANT", contractName: "Merchant" },
  ];

  for (const c of contractCodes) {
    await prisma.sysContractDefine.upsert({
      where: { contractDefineCode: c.contractDefineCode },
      update: { contractName: c.contractName },
      create: c,
    });
  }

  // 2. Platform entity (ID=1)
  const platformEntity = await prisma.sysEntity.upsert({
    where: { entityId: 1 },
    update: { entityName: "Platform" },
    create: {
      entityName: "Platform",
      country: "CN",
      status: "ACTIVE",
      timezone: "Asia/Shanghai",
    },
  });

  // 3. Entity-Contract: platform holds ADMIN contract
  const existingContract = await prisma.sysEntityContract.findFirst({
    where: {
      authorizedEntityId: platformEntity.entityId,
      authorizedContractDefineCode: "ADMIN",
    },
  });
  if (!existingContract) {
    await prisma.sysEntityContract.create({
      data: {
        authorizedEntityId: platformEntity.entityId,
        authorizedContractDefineCode: "ADMIN",
        status: "ACTIVE",
        authorizedTimestamp: new Date(),
      },
    });
  }

  // 4. Default org for platform entity
  const existingOrg = await prisma.sysOrg.findFirst({
    where: { entityId: platformEntity.entityId, parentOrgId: 0 },
  });
  if (!existingOrg) {
    await prisma.sysOrg.create({
      data: {
        entityId: platformEntity.entityId,
        orgName: platformEntity.entityName,
        parentOrgId: 0,
      },
    });
  }

  // 5. ADMIN menu
  //
  // Menu hierarchy convention (max depth 3):
  //   L1 = top-level group, path MUST be null (pure grouping, not navigable)
  //   L2 = direct child of L1, has path (real page)
  //   L3 = direct child of L2, has path (real page)
  //
  // Breadcrumb skips the L1 group (see apps/web/app/(portal)/@breadcrumbs/default.tsx).
  // Sidebar uses L1 as the section heading and renders L2 (and any L3 children
  // nested under them).

  // 5a. Home group (L1) — pure grouping, no path
  const homeMenu = await prisma.sysMenu.upsert({
    where: { menuId: 1 },
    update: { menuTitle: "Home", path: null, parentMenuId: null, icon: null, sort: 1, contractDefineCode: "ADMIN" },
    create: { menuId: 1, menuTitle: "Home", path: null, parentMenuId: null, icon: null, sort: 1, contractDefineCode: "ADMIN" },
  });

  // 5b. Home → Dashboard menu (L2)
  const dashboardMenu = await prisma.sysMenu.upsert({
    where: { menuId: 5 },
    update: { menuTitle: "Dashboard", path: "/dashboard", icon: "layout-dashboard", sort: 2, parentMenuId: homeMenu.menuId, contractDefineCode: "ADMIN" },
    create: { menuId: 5, menuTitle: "Dashboard", path: "/dashboard", icon: "layout-dashboard", sort: 2, parentMenuId: homeMenu.menuId, contractDefineCode: "ADMIN" },
  });

  // 6b. System parent menu (L1)
  const systemMenu = await prisma.sysMenu.upsert({
    where: { menuId: 2 },
    update: { menuTitle: "System", path: null, parentMenuId: null, icon: "settings", sort: 100, contractDefineCode: "ADMIN" },
    create: { menuId: 2, menuTitle: "System", path: null, parentMenuId: null, icon: "settings", sort: 100, contractDefineCode: "ADMIN" },
  });

  // 6c. System → Roles menu (L2)
  const rolesMenu = await prisma.sysMenu.upsert({
    where: { menuId: 3 },
    update: { menuTitle: "Roles", path: "/system/roles", icon: "shield", sort: 101, parentMenuId: systemMenu.menuId, contractDefineCode: "ADMIN" },
    create: { menuId: 3, menuTitle: "Roles", path: "/system/roles", icon: "shield", sort: 101, parentMenuId: systemMenu.menuId, contractDefineCode: "ADMIN" },
  });

  // 6d. System → Users menu (L2)
  const usersMenu = await prisma.sysMenu.upsert({
    where: { menuId: 4 },
    update: { menuTitle: "Users", path: "/system/users", icon: "users", sort: 102, parentMenuId: systemMenu.menuId, contractDefineCode: "ADMIN" },
    create: { menuId: 4, menuTitle: "Users", path: "/system/users", icon: "users", sort: 102, parentMenuId: systemMenu.menuId, contractDefineCode: "ADMIN" },
  });

  // 6e. Seed all permissions
  const menuKeyMap: Record<string, number> = {
    dashboard: dashboardMenu.menuId,
    roles: rolesMenu.menuId,
    users: usersMenu.menuId,
  };

  for (const p of PERMISSIONS) {
    const menuId = menuKeyMap[p.menuKey];
    const label = labelFromCode(p.code);
    await prisma.sysPermission.upsert({
      where: { permissionCode: p.code },
      update: { permissionMenuId: menuId, label, remark: p.remark },
      create: { permissionCode: p.code, permissionMenuId: menuId, label, remark: p.remark },
    });
  }

  // 7. GLOBAL admin role
  const adminRole = await prisma.sysRole.upsert({
    where: { roleId: 1 },
    update: { roleName: "Administrator" },
    create: {
      roleName: "Administrator",
      roleType: "GLOBAL",
      contractDefineCode: "ADMIN",
    },
  });

  // 8. Bind all permissions to admin role
  for (const code of PERMISSIONS.map((p) => p.code)) {
    const exists = await prisma.sysRolePermission.findFirst({
      where: { roleId: adminRole.roleId, permissionCode: code },
    });
    if (!exists) {
      await prisma.sysRolePermission.create({
        data: { roleId: adminRole.roleId, permissionCode: code },
      });
    }
  }

  // 9. Admin user
  const adminUser = await prisma.sysUser.upsert({
    where: { username: "admin" },
    update: {
      displayName: "System Administrator",
      email: "admin@cloud.local",
      passwordHash: DEFAULT_PASSWORD_HASH,
    },
    create: {
      username: "admin",
      displayName: "System Administrator",
      email: "admin@cloud.local",
      passwordHash: DEFAULT_PASSWORD_HASH,
      status: "ACTIVE",
    },
  });

  // 10. Bind user to platform entity (ADMIN type)
  await prisma.sysEntityUser.upsert({
    where: {
      entityId_userId: {
        entityId: platformEntity.entityId,
        userId: adminUser.userId,
      },
    },
    update: { authorizingType: "ADMIN", status: "ACTIVE" },
    create: {
      entityId: platformEntity.entityId,
      userId: adminUser.userId,
      authorizingType: "ADMIN",
      status: "ACTIVE",
      authorizingTimestamp: new Date(),
    },
  });

  // 11. Bind user-role in platform entity context
  const existingUserRole = await prisma.sysUserRole.findFirst({
    where: {
      entityId: platformEntity.entityId,
      userId: adminUser.userId,
      roleId: adminRole.roleId,
    },
  });
  if (!existingUserRole) {
    await prisma.sysUserRole.create({
      data: {
        entityId: platformEntity.entityId,
        userId: adminUser.userId,
        roleId: adminRole.roleId,
      },
    });
  }

  console.log(`seeded platform entity (id=${platformEntity.entityId})`);
  console.log(`seeded admin user: admin (password=${DEFAULT_PASSWORD})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
