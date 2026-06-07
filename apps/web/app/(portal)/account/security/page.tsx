import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@/app/(portal)/_components/page-body";
import { getAccountSecurity } from "@/service/account/server/account.service";
import { AccountSecurityPageClient } from "@/app/(portal)/account/_components/account-security-page";

// "Account & security" — password + MFA (TOTP). Login-only; reached from the
// user menu. Real data via /api/account/mfa + /api/account/password.
export default async function AccountSecurityPage() {
  const session = await requireSession();
  const security = await getAccountSecurity(session.userId);
  return (
    <PageBody>
      <AccountSecurityPageClient initialSecurity={security} />
    </PageBody>
  );
}
