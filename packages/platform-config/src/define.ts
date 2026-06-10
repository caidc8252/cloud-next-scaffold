import { appManifestSchema } from "./schema.ts";
import type { AppManifest } from "./types.ts";

/**
 * 编写 app 平台 manifest 的入口。
 * 编写期：参数类型约束；运行期：zod 校验 shape，非法直接抛错。
 * 返回冻结对象，避免被业务侧意外篡改。
 */
export function defineAppManifest(manifest: AppManifest): AppManifest {
  const parsed = appManifestSchema.parse(manifest) as AppManifest;
  return Object.freeze(parsed);
}
