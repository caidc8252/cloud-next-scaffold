import { prisma } from "@cloud/db";
import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@/app/(portal)/_components/page-body";
import { COUNTRIES } from "@/app/(portal)/account/_server/countries";
import { toAccountProfile } from "@/app/(portal)/account/_server/account-mapper";
import { ProfilePageClient } from "@/app/(portal)/account/_components/profile-page";

// "My profile" — personal details + sign-in identity. Login-only; reached from
// the user menu. Loads the real SysUser; edits go through /api/account/*.
export default async function ProfilePage() {
  const session = await requireSession();
  const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId: session.userId } });
  return (
    <PageBody>
      <ProfilePageClient initialProfile={toAccountProfile(user)} countries={COUNTRIES} />
    </PageBody>
  );
}
