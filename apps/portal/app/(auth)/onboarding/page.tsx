import { getPartialSession } from "@cloud/permissions/server";
import { OnboardingScreen } from "./_components/onboarding-screen";

// 入驻页：未登录/已登录均可达（被邀人可能已有会话）。token 来自邀请链接；未知 token → invalid。
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await getPartialSession();
  const currentUser = session ? { email: session.email ?? "", displayName: session.displayName } : null;
  return <OnboardingScreen token={token ?? ""} currentUser={currentUser} />;
}
