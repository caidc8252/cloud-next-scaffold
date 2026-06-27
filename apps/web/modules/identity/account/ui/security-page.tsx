import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@cloud/ui";
import { getAccountSecurity } from "../server/account.service";
import { AccountSecurityPageClient } from "./components/security-board";

// "Account & security" — password + MFA (TOTP). Login-only; reached from the
// user menu. Real data via /api/account/mfa + /api/account/password.
export async function AccountSecurityPage() {
  const session = await requireSession();
  const security = await getAccountSecurity(session.userId);
  return (
    <PageBody>
      <AccountSecurityPageClient initialSecurity={security} />
    </PageBody>
  );
}
