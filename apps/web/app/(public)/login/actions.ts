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
  const user = await prisma.user.findUnique({
    where: { account: parsed.data.account },
    include: { role: true },
  });

  if (!user) {
    redirect("/login?error=invalid");
  }

  const isValid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!isValid) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id);
  redirect("/");
}
