import { defineModule } from "@cloud/platform-config";

// roles 模块唯一真源。entry.url 保留真实路由;权限码 fn=role,动词 add→create。无 require/contractTypes。
export default defineModule({
  moduleCategory: "system",
  moduleName: "roles",
  menuCode: "system.roles",
  title: "menu.roles",
  parentMenuCode: "system",
  icon: "shield",
  order: 101,
  entry: { url: "/system/roles" },
  permissions: [
    { code: "system.roles.role.view",      belongToMenuCode: "system.roles", label: "permission.rolesView",      desc: "permission.rolesViewDesc" },
    { code: "system.roles.role.create",    belongToMenuCode: "system.roles", label: "permission.rolesCreate",    desc: "permission.rolesCreateDesc" },
    { code: "system.roles.role.update",    belongToMenuCode: "system.roles", label: "permission.rolesUpdate",    desc: "permission.rolesUpdateDesc" },
    { code: "system.roles.role.delete",    belongToMenuCode: "system.roles", label: "permission.rolesDelete",    desc: "permission.rolesDeleteDesc" },
    { code: "system.roles.role.duplicate", belongToMenuCode: "system.roles", label: "permission.rolesDuplicate", desc: "permission.rolesDuplicateDesc" },
  ],
});
