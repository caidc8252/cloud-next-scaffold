import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@cloud/ui";
import { listPartners } from "../server/account.service";
import { PartnersPageClient } from "./components/partners-board";

// "Switch partner" — the companies the user belongs to. Login-only; reached from
// the user menu. Switching reuses POST /api/auth/select-partner.
export async function PartnersPage() {
  const session = await requireSession();
  const partners = await listPartners(session.userId, session.currentPartyId);
  return (
    <PageBody>
      <PartnersPageClient initialPartners={partners} />
    </PageBody>
  );
}
