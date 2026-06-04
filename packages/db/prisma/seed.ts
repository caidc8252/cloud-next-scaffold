import { prisma } from "../src/index.ts";

// 菜单与权限定义不再入库（见 apps/*/manifest + @cloud/platform-config），seed 不再写
// sys_menu / sys_permission。平台 admin 用户通过 authorizingType=ADMIN 在运行时获得
// 当前契约下的全量权限，因此也不需要给 Administrator 角色 seed 任何 sys_role_permission。

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

  // 2. Platform partner (ID=1)
  const platformPartner = await prisma.sysPartner.upsert({
    where: { partnerId: 1 },
    update: { partnerName: "Platform" },
    create: {
      partnerName: "Platform",
      country: "CN",
      status: "ACTIVE",
      timezone: "Asia/Shanghai",
    },
  });

  // 3. Partner-Contract: platform holds ADMIN contract
  const existingContract = await prisma.sysPartnerContract.findFirst({
    where: {
      authorizedPartnerId: platformPartner.partnerId,
      authorizedContractDefineCode: "ADMIN",
    },
  });
  if (!existingContract) {
    await prisma.sysPartnerContract.create({
      data: {
        authorizedPartnerId: platformPartner.partnerId,
        authorizedContractDefineCode: "ADMIN",
        status: "ACTIVE",
        authorizedTimestamp: new Date(),
      },
    });
  }

  // 4. Default org for platform partner
  const existingOrg = await prisma.sysOrg.findFirst({
    where: { partnerId: platformPartner.partnerId, parentOrgId: 0 },
  });
  if (!existingOrg) {
    await prisma.sysOrg.create({
      data: {
        partnerId: platformPartner.partnerId,
        orgName: platformPartner.partnerName,
        parentOrgId: 0,
      },
    });
  }

  // 5. GLOBAL admin role (no permission rows — admin access derives from
  //    authorizingType=ADMIN; the role exists for the roles UI demo)
  const adminRole = await prisma.sysRole.upsert({
    where: { roleId: 1 },
    update: { roleName: "Administrator" },
    create: {
      roleName: "Administrator",
      roleType: "GLOBAL",
      contractDefineCode: "ADMIN",
    },
  });

  // 6. Admin user
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
      mfaEnabled: false,
    },
  });

  // 7. Bind user to platform partner (ADMIN type → full access at runtime)
  await prisma.sysPartnerUser.upsert({
    where: {
      partnerId_userId: {
        partnerId: platformPartner.partnerId,
        userId: adminUser.userId,
      },
    },
    update: { authorizingType: "ADMIN", status: "ACTIVE" },
    create: {
      partnerId: platformPartner.partnerId,
      userId: adminUser.userId,
      authorizingType: "ADMIN",
      status: "ACTIVE",
      authorizingTimestamp: new Date(),
    },
  });

  // 8. Bind user-role in platform partner context
  const existingUserRole = await prisma.sysUserRole.findFirst({
    where: {
      partnerId: platformPartner.partnerId,
      userId: adminUser.userId,
      roleId: adminRole.roleId,
    },
  });
  if (!existingUserRole) {
    await prisma.sysUserRole.create({
      data: {
        partnerId: platformPartner.partnerId,
        userId: adminUser.userId,
        roleId: adminRole.roleId,
      },
    });
  }

  console.log(`seeded platform partner (id=${platformPartner.partnerId})`);
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
