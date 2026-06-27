import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@cloud/ui";
import { COUNTRIES } from "@/service/account/server/countries";
import { getProfile } from "@/service/account/server/account.service";
import { ProfilePageClient } from "@/app/(dashboard)/account/_components/profile-page";

// "My profile" — personal details + sign-in identity. Login-only; reached from
// the user menu. Edits go through /api/account/*.
export default async function ProfilePage() {
  const session = await requireSession();
  const profile = await getProfile(session.userId);
  return (
    <PageBody>
      <ProfilePageClient initialProfile={profile} countries={COUNTRIES} />
    </PageBody>
  );
}
