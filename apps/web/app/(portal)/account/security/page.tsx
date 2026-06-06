import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@/app/(portal)/_components/page-body";
import { getSecurityState } from "@/app/(portal)/account/_server/account-store";
import { AccountSecurityPageClient } from "@/app/(portal)/account/_components/account-security-page";

// "Account & security" — sign-in credentials, MFA, connected services, danger
// zone. Login-only; reached from the user menu.
export default async function AccountSecurityPage() {
  await requireSession();
  return (
    <PageBody>
      <AccountSecurityPageClient initialSecurity={getSecurityState()} />
    </PageBody>
  );
}
