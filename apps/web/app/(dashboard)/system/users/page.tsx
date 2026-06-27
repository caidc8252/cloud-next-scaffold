import { requirePermissions } from "@cloud/permissions/server";
import { getTranslations } from "@cloud/i18n/server";
import { listUsersAndInvites } from "@/service/users/server/users.service";
import { listAssignableRoles } from "@/modules/system/roles/server/roles.public";
import { translateRoleLabels } from "@/app/(dashboard)/system/_shared/role-labels";
import { getPortalBaseUrl } from "@/lib/portal-routing";
import { UsersPage } from "@/app/(dashboard)/system/users/_components/users-page";

export default async function SystemUsersPage() {
  const session = await requirePermissions({ all: ["users.view"] });
  const partyId = session.currentPartyId;
  const tc = await getTranslations("coc");
  const [initialUsers, assignableRoles] = await Promise.all([
    listUsersAndInvites(partyId),
    // 可分配角色 = 平台区间内的死写预置 + 本 party 的 PRIVATE 角色（按 contractTypes 推平台）。
    listAssignableRoles(partyId, session.contractTypes),
  ]);
  // builtin 预置角色名是 coc i18n key，按 locale 翻译；DB 角色名原样。
  const initialRoles = translateRoleLabels(assignableRoles, tc);
  // PageHeader (full-bleed band) + PageBody are owned by UsersPage, since the
  // primary "New user" action lives in the header and drives client state.
  return (
    <UsersPage
      initialUsers={initialUsers}
      initialRoles={initialRoles}
      currentUserId={String(session.userId)}
      portalBaseUrl={getPortalBaseUrl()}
    />
  );
}
