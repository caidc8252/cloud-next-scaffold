import { defineModule } from "@cloud/platform-config";

export default defineModule({
  moduleCategory: "system",
  moduleName: "users",
  menuCode: "system.users",
  parentMenuCode: "system",
  icon: "users",
  order: 102,
  entry: { url: "/system/users" },
  permissions: [
    { code: "system.users.user.view",          belongToMenuCode: "system.users" },
    { code: "system.users.user.create",        belongToMenuCode: "system.users" },
    { code: "system.users.user.invite",        belongToMenuCode: "system.users" },
    { code: "system.users.user.update",        belongToMenuCode: "system.users" },
    { code: "system.users.user.lock",          belongToMenuCode: "system.users" },
    { code: "system.users.user.resetPassword", belongToMenuCode: "system.users" },
    { code: "system.users.user.changeRole",    belongToMenuCode: "system.users" },
  ],
});
