import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@cloud/ui";
import type { ProviderId } from "@/lib/auth-ui-types";
import { ProviderMark } from "./provider-mark";

// "Continue with <provider>" row — composed from the @cloud/ui Button (which
// owns its cursor/focus), never a native <button>.
export function ProviderButton({
  id,
  label,
  sublabel,
  onClick,
  disabled,
}: {
  id: ProviderId;
  label: ReactNode;
  sublabel?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      block
      disabled={disabled}
      onClick={onClick}
      className="h-11.5 justify-start gap-3 px-3.5 font-normal"
    >
      <span className="flex w-5 shrink-0 items-center justify-center">
        <ProviderMark id={id} />
      </span>
      <span className="flex flex-1 flex-col items-start text-left text-md leading-tight">
        <span>{label}</span>
        {sublabel ? <span className="text-xs text-content-tertiary">{sublabel}</span> : null}
      </span>
      <ChevronRight size={15} className="shrink-0 text-content-tertiary" />
    </Button>
  );
}
