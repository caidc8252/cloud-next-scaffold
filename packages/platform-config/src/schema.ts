import { z } from "zod";

// manifest 的 shape 校验（编写期由 TS 兜，运行期由 zod 兜）。
// 语义/完整性校验（唯一性、parent 引用、契约合法性等）见 validate.ts。

const menuPermissionSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1).optional(),
  desc: z.string().optional(),
});

const menuEntrySchema = z.object({
  menuCode: z.string().min(1),
  menuTitle: z.string().min(1),
  parentMenuCode: z.string().min(1).nullable(),
  icon: z.string().min(1).optional(),
  path: z.string().min(1).nullable().optional(),
  contractTypes: z.array(z.string().min(1)).min(1),
  order: z.number().optional(),
  permissions: z.array(menuPermissionSchema).optional(),
});

export const appManifestSchema = z.object({
  appId: z.string().min(1),
  contractKeys: z.array(z.string().min(1)).min(1),
  menus: z.array(menuEntrySchema),
});
