import { requirePermissions } from "@cloud/permissions/server";
import { listUsersAndInvites } from "@/service/users/server/users.service";
import { listRoles } from "@/service/roles/server/roles.service";
import { UsersPage } from "@/app/(portal)/system/users/_components/users-page";

export default async function SystemUsersPage() {
  const session = await requirePermissions({ all: ["users.VIEW"] });
  const partnerId = session.currentPartnerId;
  const [initialUsers, initialRoles] = await Promise.all([
    listUsersAndInvites(partnerId),
    listRoles(partnerId),
  ]);
  // PageHeader (full-bleed band) + PageBody are owned by UsersPage, since the
  // primary "New user" action lives in the header and drives client state.
  return (
    <UsersPage
      initialUsers={initialUsers}
      initialRoles={initialRoles}
      currentUserId={String(session.userId)}
    />
  );
}
