import { createCipheriv, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../..");
const TEST_PASSWORD = "ChangeMe!123";
const TEST_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Ev3lJmDRsEa0Nbomhgn47A$1lT4/JCDbV5hT5+63bxLMZBMyUinbkuEiAko+NTT96g";
const TEST_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
const LOCK_EXPIRES_AT = new Date(Date.now() + 30 * 60 * 1000);

type PartnerSeed = {
  key: "brightpos" | "harbor" | "northpeak";
  name: string;
  country: string;
  timezone: string;
};

type UserSeed = {
  username: string;
  nickName: string;
  mfaEnable: boolean;
  locked?: boolean;
  partners: PartnerSeed["key"][];
};

const PARTNERS: PartnerSeed[] = [
  {
    key: "brightpos",
    name: "PEP Test BrightPOS",
    country: "US",
    timezone: "America/New_York",
  },
  {
    key: "harbor",
    name: "PEP Test Harbor Kiosk",
    country: "US",
    timezone: "America/Los_Angeles",
  },
  {
    key: "northpeak",
    name: "PEP Test North Peak",
    country: "US",
    timezone: "America/Denver",
  },
];

const USERS: UserSeed[] = [
  {
    username: "jordan.diaz@brightpos.com",
    nickName: "Jordan Diaz",
    mfaEnable: true,
    partners: ["brightpos", "harbor", "northpeak"],
  },
  {
    username: "sms@pep.io",
    nickName: "SMS MFA Test",
    mfaEnable: true,
    partners: ["brightpos", "harbor"],
  },
  {
    username: "solo@pep.io",
    nickName: "Solo Partner Test",
    mfaEnable: false,
    partners: ["brightpos"],
  },
  {
    username: "locked@pep.io",
    nickName: "Locked Account Test",
    mfaEnable: false,
    locked: true,
    partners: ["brightpos"],
  },
  {
    username: "ratelimited@pep.io",
    nickName: "Rate Limited Test",
    mfaEnable: false,
    locked: true,
    partners: ["brightpos"],
  },
  {
    username: "rate@pep.io",
    nickName: "Rate Alias Test",
    mfaEnable: false,
    locked: true,
    partners: ["brightpos"],
  },
  {
    username: "nocompany@pep.io",
    nickName: "No Company Test",
    mfaEnable: false,
    partners: [],
  },
];

function loadRootEnv() {
  const envPath = resolve(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Add it to the root .env before seeding test users.`);
  }
  return value;
}

function loadAesKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error("NEXT_AUTH_AES_SECRET_KEY must decode to 32 bytes.");
  }
  return key;
}

function encryptSecret(plaintext: string, keyBase64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadAesKey(keyBase64), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

loadRootEnv();
requireEnv("DATABASE_URL");
const aesSecretKey = requireEnv("NEXT_AUTH_AES_SECRET_KEY");

const { prisma } = await import("../src/index.ts");

async function upsertPartner(seed: PartnerSeed) {
  return prisma.sysParty.upsert({
    where: { partyName: seed.name },
    update: {
      country: seed.country,
      timezone: seed.timezone,
      status: "ACTIVE",
    },
    create: {
      partyName: seed.name,
      country: seed.country,
      timezone: seed.timezone,
      status: "ACTIVE",
    },
  });
}

async function ensureActiveContract(partyId: number) {
  const existing = await prisma.sysPartyContract.findFirst({
    where: {
      authorizedPartyId: partyId,
      authorizedContractType: "MERCHANT",
    },
  });

  const data = {
    status: "ACTIVE",
    authorizedTimestamp: new Date(),
    effectiveFromDate: null,
    effectiveToDate: null,
  };

  if (existing) {
    await prisma.sysPartyContract.update({
      where: { partyContractId: existing.partyContractId },
      data,
    });
    return;
  }

  await prisma.sysPartyContract.create({
    data: {
      authorizedPartyId: partyId,
      authorizedContractType: "MERCHANT",
      ...data,
    },
  });
}

async function upsertUser(seed: UserSeed) {
  return prisma.sysUser.upsert({
    // seed.username 实际是邮箱（登录标识）；email 现为唯一键。
    where: { email: seed.username },
    update: {
      nickName: seed.nickName,
      email: seed.username,
      passwordHash: TEST_PASSWORD_HASH,
      passwordErrorTimes: seed.locked ? 6 : 0,
      passwordErrorLockExpiredTimestamp: seed.locked ? LOCK_EXPIRES_AT : null,
      status: "ACTIVE",
      mfaEnable: seed.mfaEnable,
    },
    create: {
      nickName: seed.nickName,
      email: seed.username,
      passwordHash: TEST_PASSWORD_HASH,
      passwordErrorTimes: seed.locked ? 6 : 0,
      passwordErrorLockExpiredTimestamp: seed.locked ? LOCK_EXPIRES_AT : null,
      status: "ACTIVE",
      mfaEnable: seed.mfaEnable,
    },
  });
}

async function resetUserPartners(userId: number, partyIds: number[]) {
  await prisma.sysPartyUser.deleteMany({ where: { userId } });

  for (const partyId of partyIds) {
    await prisma.sysPartyUser.create({
      data: {
        partyId,
        userId,
        roles: [],
        authorizingType: "ADMIN",
        authorizingTimestamp: new Date(),
        status: "ACTIVE",
      },
    });
  }
}

async function resetTotp(userId: number, enabled: boolean) {
  await prisma.sysMfaInfo.deleteMany({ where: { userId, mfaType: "TOTP" } });
  if (!enabled) return;

  await prisma.sysMfaInfo.create({
    data: {
      userId,
      mfaType: "TOTP",
      secretEncrypted: encryptSecret(TEST_TOTP_SECRET, aesSecretKey),
      failTimes: 0,
      lastFailTimestamp: null,
      status: "ACTIVE",
    },
  });
}

async function main() {
  const partners = new Map<PartnerSeed["key"], number>();
  for (const seed of PARTNERS) {
    const partner = await upsertPartner(seed);
    await ensureActiveContract(partner.partyId);
    partners.set(seed.key, partner.partyId);
  }

  for (const seed of USERS) {
    const user = await upsertUser(seed);
    const partyIds = seed.partners.map((key) => {
      const partyId = partners.get(key);
      if (!partyId) throw new Error(`Missing partner for key: ${key}`);
      return partyId;
    });
    await resetUserPartners(user.userId, partyIds);
    await resetTotp(user.userId, seed.mfaEnable);
  }

  console.log("Seeded portal login test accounts.");
  console.log(`Password for all active test accounts: ${TEST_PASSWORD}`);
  console.log(`TOTP secret for MFA accounts: ${TEST_TOTP_SECRET}`);
  console.log("MFA accounts: jordan.diaz@brightpos.com, sms@pep.io");
  console.log("Note: current real auth uses TOTP only and locks MFA after 10 failed attempts.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
