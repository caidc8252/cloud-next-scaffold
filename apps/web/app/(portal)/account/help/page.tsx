import { requireSession } from "@cloud/permissions/server";
import { PageBody } from "@/app/(portal)/_components/page-body";
import { getHelpContent } from "@/app/(portal)/account/_server/account-store";
import { HelpPageClient } from "@/app/(portal)/account/_components/help-page";

// "Help center" — search, article categories, FAQ, and direct support.
// Login-only; reached from the user menu.
export default async function HelpPage() {
  await requireSession();
  return (
    <PageBody>
      <HelpPageClient content={getHelpContent()} />
    </PageBody>
  );
}
