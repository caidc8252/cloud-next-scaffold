import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@cloud/ui";
import { listPartners } from "@/service/account/server/account.service";
import { PartnersPageClient } from "@/app/(dashboard)/account/_components/partners-page";

// "Switch partner" — the companies the user belongs to. Login-only; reached from
// the user menu. Switching reuses POST /api/auth/select-partner.
export default async function PartnersPage() {
  const session = await requireSession();
  const partners = await listPartners(session.userId, session.currentPartyId);
  return (
    <PageBody>
      <PartnersPageClient initialPartners={partners} />
    </PageBody>
  );
}
