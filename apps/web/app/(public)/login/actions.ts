"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyPassword } from "@cloud/security/server";
import { createSession } from "../../../lib/auth";

const loginSchema = z.object({
  account: z.string().trim().min(1, "Enter your account."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    account: formData.get("account"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=missing");
  }

  const { prisma } = await import("@cloud/db");

  // Find user by username
  const user = await prisma.sysUser.findUnique({
    where: { username: parsed.data.account },
  });

  if (!user) {
    redirect("/login?error=invalid");
  }

  // Check user lock status
  if (user.status === "LOCKED") {
    if (
      user.passwordErrorLockExpiredTimestamp &&
      user.passwordErrorLockExpiredTimestamp > new Date()
    ) {
      redirect("/login?error=locked");
    }
    // Lock expired, reset
    await prisma.sysUser.update({
      where: { userId: user.userId },
      data: {
        status: "ACTIVE",
        passwordErrorTimes: 0,
        passwordErrorLockExpiredTimestamp: null,
      },
    });
  }

  // Verify password
  const isValid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!isValid) {
    const errorTimes = user.passwordErrorTimes + 1;
    const updateData: Record<string, unknown> = { passwordErrorTimes: errorTimes };
    // Lock after 5 failed attempts (30 min lock)
    if (errorTimes >= 5) {
      updateData.status = "LOCKED";
      updateData.passwordErrorLockExpiredTimestamp = new Date(Date.now() + 30 * 60 * 1000);
    }
    await prisma.sysUser.update({
      where: { userId: user.userId },
      data: updateData,
    });
    redirect("/login?error=invalid");
  }

  // Find user's active entity (default to first one)
  const entityUser = await prisma.sysEntityUser.findFirst({
    where: { userId: user.userId, status: "ACTIVE" },
    include: { entity: true },
  });

  if (!entityUser || entityUser.entity.status !== "ACTIVE") {
    redirect("/login?error=no_entity");
  }

  // Login success: reset error count, update last login
  await prisma.sysUser.update({
    where: { userId: user.userId },
    data: {
      passwordErrorTimes: 0,
      passwordErrorLockExpiredTimestamp: null,
      lastLoginAt: new Date(),
    },
  });

  await createSession(user.userId, entityUser.entityId);
  redirect("/");
}
