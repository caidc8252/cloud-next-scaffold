import { z } from "zod";

// Shared client + server zod schemas, parsed at the route. No server-only —
// client forms import the same shapes.

export const passwordLoginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export const oidcLoginSchema = z.object({
  provider: z.enum(["google", "apple", "microsoft", "okta", "entra"]),
  email: z.string().trim().min(1),
  name: z.string().trim().min(1),
  sub: z.string().trim().min(1),
  mode: z.enum(["sso", "enterprise"]).default("sso"),
});

export const mfaVerifySchema = z.object({
  loginToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

export const companySelectSchema = z.object({
  loginToken: z.string().min(1),
  companyId: z.string().min(1),
});

export const emailOnlySchema = z.object({ email: z.string().trim().pipe(z.email()) });

export const verifyCodeSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  code: z.string().regex(/^\d{6}$/),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(12),
});

export const onboardingSigninSchema = z.object({
  token: z.string().min(1),
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(6),
});

export const onboardingRegisterSchema = z.object({
  token: z.string().min(1),
  email: z.string().trim().pipe(z.email()),
  loginName: z.string().min(1),
  displayName: z.string().trim().min(1),
  country: z.string().min(2),
});

export const onboardingAcceptSchema = z.object({
  token: z.string().min(1),
  email: z.string().trim().pipe(z.email()),
  name: z.string().trim().min(1),
  viaExisting: z.boolean(),
});

export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type OidcLoginInput = z.infer<typeof oidcLoginSchema>;
