"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Spinner } from "@cloud/ui";
import { request } from "@cloud/request/client";
import { useTranslations } from "@cloud/i18n/client";
import type { Account, Invitation } from "@/lib/mock/types";
import { PepLogo } from "@/app/_components/brand";
import { ObInvalid, ObWelcome } from "./ob-terminal";
import { ObLanding } from "./ob-landing";
import { ObSignin } from "./ob-signin";
import { ObRegister } from "./ob-register";
import { ObConfirm } from "./ob-confirm";

type Step = "loading" | "invalid" | "landing" | "signin" | "register" | "confirm" | "welcome";

export function OnboardingScreen({
  token,
  currentUser,
}: {
  token: string;
  currentUser: Account | null;
}) {
  const tob = useTranslations("portal.onboarding");
  const tb = useTranslations("portal.brand");
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [pending, setPending] = useState<{ viaExisting: boolean; account: { name: string; email: string } } | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);

  useEffect(() => {
    request
      .get<{ invitation: Invitation }>(`/api/onboarding/invite?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setInvitation(res.data.invitation);
        setStep("landing");
      })
      .catch(() => setStep("invalid"));
  }, [token]);

  const activeUser = signedOut ? null : currentUser;

  function goLanding() {
    setSignedOut(false);
    setStep("landing");
  }
  function goConfirm(viaExisting: boolean, account: { name: string; email: string }) {
    setPending({ viaExisting, account });
    setStep("confirm");
  }
  async function authorize() {
    if (!invitation || !pending) return;
    setAcceptBusy(true);
    try {
      await request.post("/api/onboarding/accept", {
        token: invitation.token,
        email: pending.account.email,
        name: pending.account.name,
        viaExisting: pending.viaExisting,
      });
      setStep("welcome");
    } finally {
      setAcceptBusy(false);
    }
  }

  let body;
  if (step === "loading") {
    body = <Spinner size="xl" />;
  } else if (step === "invalid") {
    body = <ObInvalid token={token} onHome={() => router.push("/")} />;
  } else if (step === "landing" && invitation) {
    body = (
      <ObLanding
        invitation={invitation}
        currentUser={activeUser}
        onUseCurrent={() => activeUser && goConfirm(true, activeUser)}
        onSignInOther={() => {
          setSignedOut(true);
          setStep("signin");
        }}
        onSignIn={() => setStep("signin")}
        onRegister={() => setStep("register")}
      />
    );
  } else if (step === "signin" && invitation) {
    body = <ObSignin invitation={invitation} onBack={goLanding} onSignedIn={(a) => goConfirm(true, a)} />;
  } else if (step === "register" && invitation) {
    body = <ObRegister invitation={invitation} onBack={goLanding} onDone={(a) => goConfirm(false, a)} />;
  } else if (step === "confirm" && invitation && pending) {
    body = (
      <ObConfirm
        invitation={invitation}
        account={pending.account}
        viaExisting={pending.viaExisting}
        onBack={goLanding}
        onAuthorize={authorize}
        busy={acceptBusy}
      />
    );
  } else if (step === "welcome" && invitation && pending) {
    body = (
      <ObWelcome
        name={pending.account.name}
        partner={invitation.partner}
        onEnter={() => {
          router.replace("/dashboard");
          router.refresh();
        }}
      />
    );
  }

  const showExit = step !== "welcome" && step !== "invalid" && step !== "loading";

  return (
    <div className="pep-fade flex min-h-screen flex-col bg-surface-3">
      <header className="flex h-[60px] items-center gap-3 border-b border-line-subtle bg-surface-2 px-6">
        <PepLogo size={26} sub={tb("newland")} />
        <div className="flex-1" />
        {showExit ? (
          <Button variant="ghost" size="sm" iconLeft={<X size={14} />} onClick={() => router.push("/")}>
            {tob("exit")}
          </Button>
        ) : null}
      </header>
      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">{body}</main>
    </div>
  );
}
