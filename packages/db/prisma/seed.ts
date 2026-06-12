import { prisma } from "../src/index.ts";

// 菜单/权限定义不入库（见 apps/*/manifest + @cloud/platform-config）。契约类型为内联枚举，
// 不再有 sys_contract_define 表。平台 admin 用户通过 authorizingType=ADMIN 在运行时获得当前
// 契约下的全量权限，因此 Administrator 角色的 permissionCodes 留空数组即可。

const DEFAULT_PASSWORD = "ChangeMe!123";
const DEFAULT_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Ev3lJmDRsEa0Nbomhgn47A$1lT4/JCDbV5hT5+63bxLMZBMyUinbkuEiAko+NTT96g";

async function main() {
  // 1. Platform partner (ID=1)
  const platformPartner = await prisma.sysParty.upsert({
    where: { partyId: 1 },
    update: { partyName: "Platform" },
    create: {
      partyName: "Platform",
      country: "CN",
      timezone: "Asia/Shanghai",
      status: "ACTIVE",
    },
  });

  // 2. Partner-Contract: platform holds ADMIN contract（内联契约类型，无 FK）
  const existingContract = await prisma.sysPartyContract.findFirst({
    where: {
      authorizedPartyId: platformPartner.partyId,
      authorizedContractType: "ADMIN",
    },
  });
  if (!existingContract) {
    await prisma.sysPartyContract.create({
      data: {
        authorizedPartyId: platformPartner.partyId,
        authorizedContractType: "ADMIN",
        status: "ACTIVE",
        authorizedTimestamp: new Date(),
      },
    });
  }

  // 4. Admin user（email 为登录标识、唯一；nickName / email 均 NOT NULL）
  const adminUser = await prisma.sysUser.upsert({
    where: { email: "admin@newlandnpt.com" },
    update: {
      nickName: "PEP Admin",
      passwordHash: DEFAULT_PASSWORD_HASH,
    },
    create: {
      nickName: "PEP Admin",
      email: "admin@newlandnpt.com",
      passwordHash: DEFAULT_PASSWORD_HASH,
      status: "ACTIVE",
      mfaEnable: false,
    },
  });

  // 5. Bind user to platform partner（ADMIN type → 运行时全量权限；roles JSONB 含 admin 角色供展示）
  await prisma.sysPartyUser.upsert({
    where: {
      partyId_userId: {
        partyId: platformPartner.partyId,
        userId: adminUser.userId,
      },
    },
    update: {
      authorizingType: "ADMIN",
      status: "ACTIVE"
    },
    create: {
      partyId: platformPartner.partyId,
      userId: adminUser.userId,
      authorizingType: "ADMIN",
      status: "ACTIVE",
      authorizingTimestamp: new Date()
    },
  });

  // sys_role 动态角色（PRIVATE）的 roleId 从 1001 起，避开死写 GLOBAL 角色预留的 1–300。
  // 兼容 SERIAL / IDENTITY：用 pg_get_serial_sequence 取序列名后 setval。
  await prisma.$queryRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('sys_role', 'role_id'), 1000, true)`,
  );

  console.log(`seeded platform partner (id=${platformPartner.partyId})`);
  console.log(`seeded admin user: admin (password=${DEFAULT_PASSWORD})`);
  console.log(`sys_role sequence set to start at 1001 (dynamic PRIVATE roles)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
