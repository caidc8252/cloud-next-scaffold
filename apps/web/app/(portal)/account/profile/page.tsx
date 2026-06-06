import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@/app/(portal)/_components/page-body";
import { getProfile } from "@/app/(portal)/account/_server/account-store";
import { COUNTRIES } from "@/app/(portal)/account/_server/countries";
import { ProfilePageClient } from "@/app/(portal)/account/_components/profile-page";

// "My profile" — personal details and sign-in identity. Login-only; reached
// from the user menu, not the main sidebar.
export default async function ProfilePage() {
  await requireSession();
  return (
    <PageBody>
      <ProfilePageClient initialProfile={getProfile()} countries={COUNTRIES} />
    </PageBody>
  );
}
