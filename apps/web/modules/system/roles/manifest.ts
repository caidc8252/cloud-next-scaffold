import { defineModule } from "@cloud/platform-config";

export default defineModule({
  moduleCategory: "system",
  moduleName: "roles",
  menuCode: "system.roles",
  parentMenuCode: "system",
  icon: "shield",
  order: 101,
  entry: { url: "/system/roles" },
  permissions: [
    { code: "system.roles.role.view",      belongToMenuCode: "system.roles" },
    { code: "system.roles.role.create",    belongToMenuCode: "system.roles" },
    { code: "system.roles.role.update",    belongToMenuCode: "system.roles" },
    { code: "system.roles.role.delete",    belongToMenuCode: "system.roles" },
    { code: "system.roles.role.duplicate", belongToMenuCode: "system.roles" },
  ],
});
