import { z } from "zod";
import type { MenuTreeNodeDecl, ModuleManifest } from "./registry-types.ts";

const permissionSchema = z.object({
  code: z.string().min(1),
  belongToMenuCode: z.string().min(1),
  label: z.string().min(1),
  desc: z.string().min(1),
});

const moduleSchema = z.object({
  moduleCategory: z.string().min(1),
  moduleName: z.string().min(1),
  menuCode: z.string().min(1),
  title: z.string().min(1),
  parentMenuCode: z.string().min(1),
  icon: z.string().optional(),
  order: z.number().optional(),
  entry: z.object({ url: z.string().min(1) }),
  permissions: z.array(permissionSchema),
});

const menuTreeSchema = z.array(
  z.object({
    menuCode: z.string().min(1),
    title: z.string().min(1),
    parentMenuCode: z.string().min(1).nullable(),
    icon: z.string().optional(),
    order: z.number().optional(),
  }),
);

/** 模块 manifest 入口:编写期类型约束 + 运行期 zod 校验,返回冻结对象。 */
export function defineModule(manifest: ModuleManifest): ModuleManifest {
  return Object.freeze(moduleSchema.parse(manifest) as ModuleManifest);
}

/** 目录骨架入口。 */
export function defineMenuTree(nodes: MenuTreeNodeDecl[]): MenuTreeNodeDecl[] {
  return Object.freeze(menuTreeSchema.parse(nodes) as MenuTreeNodeDecl[]) as MenuTreeNodeDecl[];
}
