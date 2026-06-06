import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@/app/(portal)/_components/page-body";
import { loadAccountPartners } from "@/app/(portal)/account/_server/partner-service";
import { PartnersPageClient } from "@/app/(portal)/account/_components/partners-page";

// "Switch partner" — the companies the user belongs to. Login-only; reached from
// the user menu. Switching reuses POST /api/auth/select-partner.
export default async function PartnersPage() {
  const session = await requireSession();
  const partners = await loadAccountPartners(session.userId, session.currentPartnerId);
  return (
    <PageBody>
      <PartnersPageClient initialPartners={partners} />
    </PageBody>
  );
}
