import "client-only";

// 既接受标准 SPKI PEM，也接受裸 base64 DER（无 PEM 头尾）：先剥掉 PEM armor（没有则原样），
// 去空白后 atob 解码即得 DER 字节，所以裸 base64 公钥可直接传入，无需单独的 DER 入参分支。
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** 用 RSA 公钥（SPKI PEM 或裸 base64 DER）做 OAEP+SHA-256 加密，输出 base64。公钥由调用方注入，包不内嵌密钥。 */
export async function encryptRsaOaep(plaintext: string, publicKey: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(publicKey),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    key,
    new TextEncoder().encode(plaintext),
  );
  return arrayBufferToBase64(encrypted);
}
