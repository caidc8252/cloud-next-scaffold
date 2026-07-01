import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@cloud/ui";
import { COUNTRIES } from "../server/countries";
import { getProfile } from "../server/account.service";
import { ProfilePageClient } from "./components/profile-board";

// "My profile" — personal details + sign-in identity. Login-only; reached from
// the user menu. Edits go through /api/account/*.
export async function ProfilePage() {
  const session = await requireSession();
  const profile = await getProfile(session.userId);
  return (
    <PageBody>
      <ProfilePageClient initialProfile={profile} countries={COUNTRIES} />
    </PageBody>
  );
}
