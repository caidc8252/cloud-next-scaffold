"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button, Spinner } from "@cloud/ui";
import { logout } from "@/service/auth/api";
import { acceptOnboarding, getOnboardingInvite } from "@/service/onboarding/api";
import { useTranslations } from "@cloud/i18n/client";
import { PepLogo } from "@/app/_components/brand";
import type { CurrentUser, InvitePublic } from "./types";
import { ObInvalid } from "./ob-terminal";
import { ObLanding } from "./ob-landing";
import { ObRegister } from "./ob-register";

type Step = "loading" | "invalid" | "landing" | "register";

// 入驻：验票 → 落地（已登录用当前账号加入 / 换账号 / 新建账号）。token 即授权。
// 既有用户走真登录（/login?returnTo 回跳本页）；接受邀请成功后跳后端给的 redirectTo（按组 handoff 进 console）。
export function OnboardingScreen({ token, currentUser }: { token: string; currentUser: CurrentUser | null }) {
  const tob = useTranslations("portal.onboarding");
  const tb = useTranslations("portal.brand");
  const [step, setStep] = useState<Step>("loading");
  const [invite, setInvite] = useState<InvitePublic | null>(null);

  useEffect(() => {
    getOnboardingInvite(token)
      .then((res) => {
        setInvite(res.data.invitation);
        setStep("landing");
      })
      .catch(() => setStep("invalid"));
  }, [token]);

  const returnTo = `/onboarding?token=${encodeURIComponent(token)}`;

  async function joinAsCurrent() {
    const res = await acceptOnboarding({ mode: "existing", token });
    window.location.assign(res.data.redirectTo);
  }
  function goLogin() {
    window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  async function switchAccount() {
    await logout().catch(() => {});
    goLogin();
  }

  let body;
  if (step === "loading") {
    body = <Spinner size="xl" />;
  } else if (step === "invalid") {
    body = <ObInvalid token={token} onHome={() => window.location.assign("/login")} />;
  } else if (step === "landing" && invite) {
    body = (
      <ObLanding
        invite={invite}
        currentUser={currentUser}
        onJoinCurrent={joinAsCurrent}
        onLogin={goLogin}
        onSwitch={switchAccount}
        onRegister={() => setStep("register")}
      />
    );
  } else if (step === "register" && invite) {
    body = <ObRegister invite={invite} token={token} onBack={() => setStep("landing")} />;
  }

  const showExit = step === "landing" || step === "register";

  return (
    <div className="pep-fade flex min-h-screen flex-col bg-surface-3">
      <header className="flex h-15 items-center gap-3 border-b border-line-subtle bg-surface-2 px-6">
        <PepLogo size={26} sub={tb("newland")} />
        <div className="flex-1" />
        {showExit ? (
          <Button variant="ghost" size="sm" iconLeft={<X size={14} />} onClick={() => window.location.assign("/login")}>
            {tob("exit")}
          </Button>
        ) : null}
      </header>
      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">{body}</main>
    </div>
  );
}
