import { prisma } from "../src/index.ts";

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
  const dashboardMenu = await prisma.sysMenu.upsert({
    where: { menuId: 1 },
    update: {
      menuTitle: "Workspace",
      path: "/",
      icon: "layout-dashboard",
      sort: 1,
      contractDefineCode: "ADMIN",
    },
    create: {
      menuTitle: "Workspace",
      path: "/",
      icon: "layout-dashboard",
      sort: 1,
      contractDefineCode: "ADMIN",
    },
  });

  // 6. Permission for dashboard
  await prisma.sysPermission.upsert({
    where: { permissionCode: "dashboard:view" },
    update: { permissionMenuId: dashboardMenu.menuId },
    create: {
      permissionCode: "dashboard:view",
      permissionMenuId: dashboardMenu.menuId,
      remark: "View dashboard",
    },
  });

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

  // 8. Bind permission to role
  const existingRolePerm = await prisma.sysRolePermission.findFirst({
    where: { roleId: adminRole.roleId, permissionCode: "dashboard:view" },
  });
  if (!existingRolePerm) {
    await prisma.sysRolePermission.create({
      data: { roleId: adminRole.roleId, permissionCode: "dashboard:view" },
    });
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
