import { cn } from "@cloud/ui";

// PEP brand mark — a midnight-indigo rounded tile with three rising bars
// (growth / payment volume). Colors reference @cloud/ui primary tokens so the
// mark re-themes with the design system.
export function PepMark({ size = 32 }: { size?: number }) {
  const r = Math.round(size * 0.26);
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="block">
      <rect x="0" y="0" width="32" height="32" rx={r} fill="var(--color-primary-700)" />
      <rect x="8" y="17" width="4.2" height="7" rx="2.1" fill="white" opacity="0.7" />
      <rect x="13.9" y="12" width="4.2" height="12" rx="2.1" fill="white" opacity="0.85" />
      <rect x="19.8" y="8" width="4.2" height="16" rx="2.1" fill="var(--color-primary-300)" />
    </svg>
  );
}

// Lockup — mark + "PEP" wordmark with an optional uppercase sublabel.
export function PepLogo({
  size = 30,
  sub,
  onDark = false,
}: {
  size?: number;
  sub?: string;
  onDark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <PepMark size={size} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            onDark ? "text-white" : "text-content-primary",
          )}
        >
          PEP
        </span>
        {sub ? (
          <span
            className={cn(
              "mt-0.5 text-xs font-medium uppercase tracking-wider",
              onDark ? "text-white/60" : "text-content-tertiary",
            )}
          >
            {sub}
          </span>
        ) : null}
      </span>
    </span>
  );
}
