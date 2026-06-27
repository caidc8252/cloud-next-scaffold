import "server-only";

import { prisma } from "@cloud/db";
import { encryptSecret, decryptSecret } from "@cloud/security/server";
import { getConfig } from "@cloud/config";
import { PASSWORD_POLICY } from "@cloud/constants";
import { generateTotpSecret, totpKeyUri, verifyTotp } from "@/lib/totp";
import type { MfaStatus } from "@/app/(dashboard)/account/_shared/types";

// MFA（TOTP）业务逻辑。account（启用/重配/关闭/改密 step-up）与 auth（登录二次校验）共用，
// 故独立成 service/mfa，避免 auth → account 跨域依赖。
// 状态 = SysUser.mfaEnable + SysMfaInfo.status。不变量（无 DB 唯一约束，靠这里 + 事务保证）：
// 稳态 ≤1 ACTIVE、≤1 PENDING；Reconfigure 过渡期允许 1 ACTIVE + 1 PENDING。
// 登录校验遍历所有 ACTIVE，任一通过即可。
// 注：本域事务密集（activate / disable 跨表多写），数据访问保留在 service 内（不强拆 repository）。

const MFA_TYPE = "TOTP";
const MAX_FAIL = 10;

const secretKey = () => getConfig().NEXT_AUTH_AES_SECRET_KEY;
const lockWindowMs = () => PASSWORD_POLICY.lockDurationMinutes * 60_000;

export async function getMfaStatus(userId: number): Promise<MfaStatus> {
  const rows = await prisma.sysMfaInfo.findMany({
    where: { userId, mfaType: MFA_TYPE },
    select: { status: true },
  });
  if (rows.some((r) => r.status === "ACTIVE")) return "ACTIVE";
  if (rows.some((r) => r.status === "PENDING")) return "PENDING";
  return "NONE";
}

export type TotpVerifyResult = "ok" | "invalid" | "none" | "locked";

/** 对该用户所有 ACTIVE 因子逐个 TOTP 校验，任一通过即 ok。维护 failTimes / 锁定窗口。 */
export async function verifyActiveTotp(userId: number, code: string): Promise<TotpVerifyResult> {
  const actives = await prisma.sysMfaInfo.findMany({
    where: { userId, mfaType: MFA_TYPE, status: "ACTIVE" },
  });
  if (actives.length === 0) return "none";

  const now = Date.now();
  const lockedNow = actives.some(
    (r) => r.failTimes >= MAX_FAIL && r.lastFailTimestamp != null && now - r.lastFailTimestamp.getTime() < lockWindowMs(),
  );
  if (lockedNow) return "locked";
  // 锁定窗口已过：清零陈旧计数后继续校验
  if (actives.some((r) => r.failTimes >= MAX_FAIL)) {
    await prisma.sysMfaInfo.updateMany({
      where: { userId, mfaType: MFA_TYPE, status: "ACTIVE" },
      data: { failTimes: 0, lastFailTimestamp: null },
    });
  }

  const key = secretKey();
  const matched = actives.some((r) => verifyTotp(code, decryptSecret(r.secretEncrypted, key)));
  if (matched) {
    await prisma.sysMfaInfo.updateMany({
      where: { userId, mfaType: MFA_TYPE, status: "ACTIVE" },
      data: { failTimes: 0, lastFailTimestamp: null },
    });
    return "ok";
  }

  await prisma.sysMfaInfo.updateMany({
    where: { userId, mfaType: MFA_TYPE, status: "ACTIVE" },
    data: { failTimes: { increment: 1 }, lastFailTimestamp: new Date() },
  });
  const refreshed = await prisma.sysMfaInfo.findMany({
    where: { userId, mfaType: MFA_TYPE, status: "ACTIVE" },
    select: { failTimes: true },
  });
  return refreshed.some((r) => r.failTimes >= MAX_FAIL) ? "locked" : "invalid";
}

export type EnrollResult = { mfaInfoId: number; secret: string; otpauthUri: string; reconfigure: boolean };

/** 启用（mfaEnable=false）或重配（已 ACTIVE）：建/刷新一条 PENDING + 新 secret。返回明文 secret 供二维码。 */
export async function startEnrollment(userId: number, accountName: string, issuer: string): Promise<EnrollResult> {
  const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId } });
  const secret = generateTotpSecret();
  const secretEncrypted = encryptSecret(secret, secretKey());

  if (!user.mfaEnable) {
    // Enable：复用已有 PENDING（刷新 secret）以保持 ≤1 PENDING，否则新建
    const pending = await prisma.sysMfaInfo.findFirst({
      where: { userId, mfaType: MFA_TYPE, status: "PENDING" },
    });
    const row = pending
      ? await prisma.sysMfaInfo.update({
          where: { mfaInfoId: pending.mfaInfoId },
          data: { secretEncrypted, failTimes: 0, lastFailTimestamp: null },
        })
      : await prisma.sysMfaInfo.create({
          data: { userId, mfaType: MFA_TYPE, status: "PENDING", secretEncrypted },
        });
    return { mfaInfoId: row.mfaInfoId, secret, otpauthUri: totpKeyUri(accountName, issuer, secret), reconfigure: false };
  }

  // Reconfigure：保留 ACTIVE，清掉陈旧 PENDING 后建新 PENDING（暂存 1 ACTIVE + 1 PENDING）
  await prisma.sysMfaInfo.deleteMany({ where: { userId, mfaType: MFA_TYPE, status: "PENDING" } });
  const row = await prisma.sysMfaInfo.create({
    data: { userId, mfaType: MFA_TYPE, status: "PENDING", secretEncrypted },
  });
  return { mfaInfoId: row.mfaInfoId, secret, otpauthUri: totpKeyUri(accountName, issuer, secret), reconfigure: true };
}

export type ActivateResult = "ok" | "invalid" | "missing";

/** 激活某条 PENDING：验码通过后在事务里置 ACTIVE、删其余行（重配的旧 ACTIVE / 杂散 PENDING）、置 mfaEnable=true。 */
export async function activateEnrollment(userId: number, mfaInfoId: number, code: string): Promise<ActivateResult> {
  const row = await prisma.sysMfaInfo.findUnique({ where: { mfaInfoId } });
  if (!row || row.userId !== userId || row.status !== "PENDING") return "missing";
  if (!verifyTotp(code, decryptSecret(row.secretEncrypted, secretKey()))) return "invalid";

  await prisma.$transaction(async (tx) => {
    await tx.sysMfaInfo.update({
      where: { mfaInfoId },
      data: { status: "ACTIVE", failTimes: 0, lastFailTimestamp: null },
    });
    // 删掉同用户/类型的其它行：重配时即旧 ACTIVE；启用时通常无
    await tx.sysMfaInfo.deleteMany({ where: { userId, mfaType: MFA_TYPE, mfaInfoId: { not: mfaInfoId } } });
    await tx.sysUser.update({ where: { userId }, data: { mfaEnable: true } });
  });
  return "ok";
}

/** 关闭 MFA（step-up 由调用方校验）：清 mfaEnable + 删所有因子。 */
export async function disableMfa(userId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.sysUser.update({ where: { userId }, data: { mfaEnable: false } });
    await tx.sysMfaInfo.deleteMany({ where: { userId, mfaType: MFA_TYPE } });
  });
}
