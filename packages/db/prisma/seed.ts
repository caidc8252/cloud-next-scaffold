import { prisma } from "../src/index.ts";

const DEFAULT_PASSWORD = "ChangeMe!123";
const DEFAULT_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Ev3lJmDRsEa0Nbomhgn47A$1lT4/JCDbV5hT5+63bxLMZBMyUinbkuEiAko+NTT96g";

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { key: "admin" },
    update: { name: "Administrator" },
    create: {
      key: "admin",
      name: "Administrator"
    }
  });

  await prisma.menu.upsert({
    where: { key: "dashboard" },
    update: {
      label: "Workspace",
      path: "/",
      icon: "layout-dashboard",
      sortOrder: 1,
      roleId: adminRole.id
    },
    create: {
      key: "dashboard",
      label: "Workspace",
      path: "/",
      icon: "layout-dashboard",
      sortOrder: 1,
      roleId: adminRole.id
    }
  });

  await prisma.user.upsert({
    where: { account: "admin" },
    update: {
      name: "System Administrator",
      email: "admin@cloud.local",
      passwordHash: DEFAULT_PASSWORD_HASH,
      roleId: adminRole.id
    },
    create: {
      account: "admin",
      name: "System Administrator",
      email: "admin@cloud.local",
      passwordHash: DEFAULT_PASSWORD_HASH,
      roleId: adminRole.id
    }
  });

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
