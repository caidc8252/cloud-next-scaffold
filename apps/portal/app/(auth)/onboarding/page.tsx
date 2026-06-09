import { getSession } from "@/lib/mock/session";
import { OnboardingScreen } from "./_components/onboarding-screen";

const DEFAULT_TOKEN = "inv_8f2c1a";

// Onboarding is reachable both signed-out and signed-in (the invitee may
// already have a session). The signed-in landing is exercised by visiting here
// after signing in; an unknown ?token surfaces the invalid state.
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await getSession();
  return <OnboardingScreen token={token ?? DEFAULT_TOKEN} currentUser={session} />;
}
