import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@/app/(portal)/_components/page-body";
import { getPartners } from "@/app/(portal)/account/_server/account-store";
import { PartnersPageClient } from "@/app/(portal)/account/_components/partners-page";

// "Switch partner" — the entities the user belongs to, each opening in its own
// portal. Login-only; reached from the user menu.
export default async function PartnersPage() {
  await requireSession();
  return (
    <PageBody>
      <PartnersPageClient initialPartners={getPartners()} />
    </PageBody>
  );
}
