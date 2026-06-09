import "server-only";

import { prisma } from "@cloud/db";
import { getAuthConfig } from "@cloud/config";
import { decryptSecret } from "@cloud/security/server";
import { verifyTotp } from "./totp";

const MFA_TYPE = "TOTP";
const MAX_FAIL = 10;

const secretKey = () => getAuthConfig().mfaSecretKey;
const lockWindowMs = () => getAuthConfig().lockDurationMinutes * 60_000;

export type TotpVerifyResult = "ok" | "invalid" | "none" | "locked";

// 只验证已激活的 TOTP 因子。错误次数锁定写在因子表上，避免把 MFA
// 临时锁和账号状态混在一起；锁定窗口过后再次尝试会清零旧失败次数。
export async function verifyActiveTotp(userId: number, code: string): Promise<TotpVerifyResult> {
  const actives = await prisma.sysMfaInfo.findMany({
    where: { userId, mfaType: MFA_TYPE, status: "ACTIVE" },
  });
  if (actives.length === 0) return "none";

  const now = Date.now();
  const lockedNow = actives.some(
    (row) =>
      row.failTimes >= MAX_FAIL &&
      row.lastFailTimestamp != null &&
      now - row.lastFailTimestamp.getTime() < lockWindowMs(),
  );
  if (lockedNow) return "locked";

  if (actives.some((row) => row.failTimes >= MAX_FAIL)) {
    await prisma.sysMfaInfo.updateMany({
      where: { userId, mfaType: MFA_TYPE, status: "ACTIVE" },
      data: { failTimes: 0, lastFailTimestamp: null },
    });
  }

  const key = secretKey();
  const matched = actives.some((row) => verifyTotp(code, decryptSecret(row.secretEncrypted, key)));
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
  return refreshed.some((row) => row.failTimes >= MAX_FAIL) ? "locked" : "invalid";
}
