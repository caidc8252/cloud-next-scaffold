import type { ProviderId } from "@/lib/auth-ui-types";

// Third-party / enterprise IdP brand metadata. Provider brand colors are real
// brand marks (not theme tokens), so hex/SVG fills are intentional here.
export const PROVIDERS: Record<ProviderId, { label: string; sub: string }> = {
  google: { label: "Google", sub: "accounts.google.com" },
  apple: { label: "Apple", sub: "appleid.apple.com" },
  microsoft: { label: "Microsoft", sub: "login.microsoftonline.com" },
  okta: { label: "Okta", sub: "acme.okta.com" },
  entra: { label: "Microsoft Entra ID", sub: "login.microsoftonline.com" },
};

export function ProviderMark({ id, size = 18 }: { id: ProviderId; size?: number }) {
  if (id === "google") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.3 0 6.3 1.1 8.6 3.4l6.4-6.4C35 2.8 29.9.8 24 .8 14.6.8 6.5 6.2 2.6 14l7.5 5.8C11.9 14 17.5 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.4-4.7 7l7.3 5.7c4.3-4 6.8-9.9 6.8-17.2z" />
        <path fill="#FBBC05" d="M10.1 28.2c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.5-5.8C1 16.2 0 19.9 0 23.5s1 7.3 2.6 10.5l7.5-5.8z" />
        <path fill="#34A853" d="M24 47c6 0 11-2 14.7-5.4l-7.3-5.7c-2 1.4-4.6 2.2-7.4 2.2-6.5 0-12-4.4-13.9-10.4l-7.5 5.8C6.5 40.8 14.6 47 24 47z" />
      </svg>
    );
  }
  if (id === "apple") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="text-content-primary">
        <path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9s-1.9-.9-3.1-.8c-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.2 1.7 2.5 3 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.7c1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.6-3.6zM14.3 5.3c.6-.8 1.1-1.9 1-3-.9.1-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2-.5 2.7-1.3z" />
      </svg>
    );
  }
  if (id === "microsoft" || id === "entra") {
    return (
      <svg width={size} height={size} viewBox="0 0 23 23" aria-hidden>
        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
        <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
        <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
      </svg>
    );
  }
  // okta
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="#00297A" strokeWidth="4.4" />
    </svg>
  );
}
