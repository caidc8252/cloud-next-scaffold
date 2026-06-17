import { z } from "zod";

// 默认值需与 password-policy.ts 的 PASSWORD_POLICY 展示值保持一致
const authConfigSchema = z.object({
  // base64 编码的 PKCS#8 裸 DER 私钥（与前端 NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY 成对）。
  AUTH_LOGIN_RSA_PRIVATE_KEY: z.string().min(1),
  // 32 字节、base64 编码的 AES 密钥，用于加密 SysMfaInfo.secretEncrypted（TOTP 密钥）。
  AUTH_AES_SECRET_KEY: z.string().min(1),
});

export type AuthConfig = {
  // RSA 私钥裸 DER（PKCS#8），可直接传给 @cloud/security 的 decryptRsaOaep（PrivateKeyInput 结构）。
  rsaPrivateKey: { key: Buffer; format: "der"; type: "pkcs8" };
  aesSecretKey: string;
};

/** 纯函数：从环境变量解析 auth 运行期配置。密钥/阈值由 env 提供，便于单测注入。 */
export function parseAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const parsed = authConfigSchema.parse(env);
  return {
    // env 里是 base64 编码的 PKCS#8 裸 DER，解码成 Buffer 后包成 DER 入参。
    rsaPrivateKey: {
      key: Buffer.from(parsed.AUTH_LOGIN_RSA_PRIVATE_KEY, "base64"),
      format: "der",
      type: "pkcs8",
    },
    aesSecretKey: parsed.AUTH_AES_SECRET_KEY,
  };
}
