import { prisma } from "../src/index.ts";

// 菜单/权限定义不入库（见 apps/*/manifest + @cloud/platform-config）。契约类型为内联枚举，
// 不再有 sys_contract_define 表。平台 admin 用户绑定 Administrator（roleId 1）预置通配角色，
// 会话据此注入当前 party 的 scope（Administrator 的 permissionCodes 在代码注册表里留空作通配标记，
// 由 isPresetAdminRole 识别）。authorizingType 保留作展示标志，不再驱动权限。

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

  // 5. Bind user to platform partner：绑定 Administrator（roleId 1）预置通配角色 → 会话注入当前 party 的 scope。
  //    roles JSONB 形如 [{ roleId }]；不绑则新模型下零权限、后台进不去（authorizingType 仅作展示）。
  await prisma.sysPartyUser.upsert({
    where: {
      partyId_userId: {
        partyId: platformPartner.partyId,
        userId: adminUser.userId,
      },
    },
    update: {
      authorizingType: "ADMIN",
      status: "ACTIVE",
      roles: [{ roleId: 1 }],
    },
    create: {
      partyId: platformPartner.partyId,
      userId: adminUser.userId,
      authorizingType: "ADMIN",
      status: "ACTIVE",
      authorizingTimestamp: new Date(),
      roles: [{ roleId: 1 }],
    },
  });

  // E2E-only：为 playwright 的（未来）`user` storageState 工程预置一个**非 admin** 用户。
  // 门控在 process.env.E2E_SEED（test:e2e 链路用 E2E_SEED=1 跑 seed）—— 已知密码的测试账号
  // 绝不能落进真实环境。绑定 platform party、roles 为空数组 → 零权限但仍是合法登录
  // （notice 路由仅校验登录态）。与 admin 拆开，便于 e2e 断言按角色显隐的 UI 差异。
  if (process.env.E2E_SEED) {
    const e2eUser = await prisma.sysUser.upsert({
      where: { email: "e2e-user@newlandnpt.com" },
      update: { nickName: "E2E User", passwordHash: DEFAULT_PASSWORD_HASH },
      create: {
        nickName: "E2E User",
        email: "e2e-user@newlandnpt.com",
        passwordHash: DEFAULT_PASSWORD_HASH,
        status: "ACTIVE",
        mfaEnable: false,
      },
    });
    await prisma.sysPartyUser.upsert({
      where: {
        partyId_userId: { partyId: platformPartner.partyId, userId: e2eUser.userId },
      },
      update: { authorizingType: "MEMBER", status: "ACTIVE", roles: [] },
      create: {
        partyId: platformPartner.partyId,
        userId: e2eUser.userId,
        authorizingType: "MEMBER",
        status: "ACTIVE",
        authorizingTimestamp: new Date(),
        roles: [],
      },
    });
    console.log(`[E2E_SEED] seeded non-admin user: e2e-user@newlandnpt.com (password=${DEFAULT_PASSWORD})`);
  }

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
