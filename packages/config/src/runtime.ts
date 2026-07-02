import { z } from "zod";

const runtimeConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CI: z
    .string()
    .optional()
    .transform((value) => value === "1" || value?.toLowerCase() === "true"),
  DEV_AUTH_BYPASS: z
    .enum(["0", "1"])
    .default("0")
    .transform((value) => value === "1"),
  DEV_AUTH_BYPASS_EMAIL: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().pipe(z.email()).optional(),
    )
    .transform((value) => value ?? null),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export function parseRuntimeConfig(env: Record<string, string | undefined>): RuntimeConfig {
  return runtimeConfigSchema.parse(env);
}
