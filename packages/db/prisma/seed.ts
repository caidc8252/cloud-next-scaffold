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

  // sys_role 动态角色（PRIVATE）的 roleId 从 1001 起，避开死写 GLOBAL 角色预留的 1–300。
  // 兼容 SERIAL / IDENTITY：用 pg_get_serial_sequence 取序列名后 setval。
  await prisma.$queryRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('sys_role', 'role_id'), 1000, true)`,
  );

  // 给 admin 预置几条站内通知（dev/e2e 用；幂等：先按 user 清再插）
  await prisma.sysNotice.deleteMany({ where: { userId: adminUser.userId } });
  await prisma.sysNotice.createMany({
    data: [
      {
        userId: adminUser.userId,
        belongToPartyId: platformPartner.partyId,
        noticeType: "ticket.assigned",
        title: "A ticket was assigned to you",
        status: "UNREAD",
        payload: {
          summary: "T-2026-003 · Security alert",
          detail: "Assigned to you for L2 triage.",
          fields: [
            { key: "ticket", value: "T-2026-003", mono: true },
            { key: "priority", value: "High" },
          ],
          links: [{ label: "Open ticket T-2026-003", type: "button", url: "/tickets/T-2026-003" }],
        },
      },
      {
        userId: adminUser.userId,
        belongToPartyId: platformPartner.partyId,
        noticeType: "order.complete",
        title: "Your order is complete",
        status: "READ",
        payload: {
          summary: "SO-2026-0184 completed",
          fields: [{ key: "order", value: "SO-2026-0184", mono: true }],
        },
      },
      {
        userId: adminUser.userId,
        belongToPartyId: null,
        noticeType: "account.passwordReset",
        title: "Your password was reset",
        status: "UNREAD",
        payload: { summary: "An administrator reset your password" },
      },
    ],
  });
  console.log(`seeded notices for admin (userId=${adminUser.userId})`);

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
