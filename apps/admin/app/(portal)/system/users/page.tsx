import { requirePermissions } from "@cloud/permissions/server";
import { listUsersAndInvites } from "@/service/users/server/users.service";
import { listAssignableRoles } from "@/service/roles/server/roles.service";
import { getPortalBaseUrl } from "@/lib/portal-routing";
import { UsersPage } from "@/app/(portal)/system/users/_components/users-page";

export default async function SystemUsersPage() {
  const session = await requirePermissions({ all: ["users.VIEW"] });
  const partyId = session.currentPartyId;
  const [initialUsers, initialRoles] = await Promise.all([
    listUsersAndInvites(partyId),
    // 可分配角色 = 平台区间内的死写预置 + 本 party 的 PRIVATE 角色（按 contractTypes 推平台）。
    listAssignableRoles(partyId, session.contractTypes),
  ]);
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
