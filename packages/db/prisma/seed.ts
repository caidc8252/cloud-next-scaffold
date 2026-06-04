import { prisma } from "../src/index.ts";

// 菜单/权限定义不入库（见 apps/*/manifest + @cloud/platform-config）。契约类型为内联枚举，
// 不再有 sys_contract_define 表。平台 admin 用户通过 authorizingType=ADMIN 在运行时获得当前
// 契约下的全量权限，因此 Administrator 角色的 permissionCodes 留空数组即可。

const DEFAULT_PASSWORD = "ChangeMe!123";
const DEFAULT_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Ev3lJmDRsEa0Nbomhgn47A$1lT4/JCDbV5hT5+63bxLMZBMyUinbkuEiAko+NTT96g";

async function main() {
  // 1. Platform partner (ID=1)
  const platformPartner = await prisma.sysPartner.upsert({
    where: { partnerId: 1 },
    update: { partnerName: "Platform" },
    create: {
      partnerName: "Platform",
      country: "CN",
      timezone: "Asia/Shanghai",
      status: "ACTIVE",
    },
  });

  // 2. Partner-Contract: platform holds ADMIN contract（内联契约类型，无 FK）
  const existingContract = await prisma.sysPartnerContract.findFirst({
    where: {
      authorizedPartnerId: platformPartner.partnerId,
      authorizedContractType: "ADMIN",
    },
  });
  if (!existingContract) {
    await prisma.sysPartnerContract.create({
      data: {
        authorizedPartnerId: platformPartner.partnerId,
        authorizedContractType: "ADMIN",
        status: "ACTIVE",
        authorizedTimestamp: new Date(),
      },
    });
  }

  // 4. Admin user（username / nickName / email 均 NOT NULL）
  const adminUser = await prisma.sysUser.upsert({
    where: { username: "admin" },
    update: {
      nickName: "PEP Admin",
      email: "admin@newlandnpt.com",
      passwordHash: DEFAULT_PASSWORD_HASH,
    },
    create: {
      username: "admin",
      nickName: "PEP Admin",
      email: "admin@newlandnpt.com",
      passwordHash: DEFAULT_PASSWORD_HASH,
      status: "ACTIVE",
      mfaEnable: false,
    },
  });

  // 5. Bind user to platform partner（ADMIN type → 运行时全量权限；roles JSONB 含 admin 角色供展示）
  await prisma.sysPartnerUser.upsert({
    where: {
      partnerId_userId: {
        partnerId: platformPartner.partnerId,
        userId: adminUser.userId,
      },
    },
    update: {
      authorizingType: "ADMIN",
      status: "ACTIVE"
    },
    create: {
      partnerId: platformPartner.partnerId,
      userId: adminUser.userId,
      authorizingType: "ADMIN",
      status: "ACTIVE",
      authorizingTimestamp: new Date()
    },
  });

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
