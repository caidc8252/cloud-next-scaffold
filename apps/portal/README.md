# PEP Portal

A runnable **PEP** partner portal (Payment Empowerment Platform) for Newland —
home, sign-in, account recovery, invite onboarding, and a minimal post-login
dashboard. The UI was ported from `docs/Carbon-Login` into `@cloud/ui`
primitives.

Password sign-in, MFA verification, partner selection, and session creation use
the real shared backend (`@cloud/db`, `@cloud/permissions`, `@cloud/security`,
Redis, and the platform manifest). Some prototype-only paths, such as SSO,
forgot-password, onboarding, and the demo dashboard, still use the local
`lib/mock/` store until those domains are implemented.

## Run

```bash
pnpm --filter portal dev      # http://localhost:3100
pnpm --filter portal build && pnpm --filter portal start
```

Requires the root `.env` used by the monorepo. Important values include
`DATABASE_URL`, `REDIS_URL`, `ADMIN_APP_URL`, `NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY`,
`AUTH_LOGIN_RSA_PRIVATE_KEY`, and `AUTH_AES_SECRET_KEY`.

## Demo scenarios

The real password login uses seeded users such as `admin / ChangeMe!123`. The
prototype-only SSO and recovery routes still use deterministic demo inputs:

| Input | Reaches |
|---|---|
| `…@acmepay.com` / `…@verakiosk.com` | enterprise SSO (Okta / Google) IdP |
| `…@northpeak.io` | SSO-suspended notice + password fallback |

Onboarding: visit `/onboarding` (signed-out landing) or sign in first then visit
it (signed-in landing). `/onboarding?token=bad` shows the invalid state. Invite
code in the recovery / register flows: `123456` (or any 6 digits).

## Layout

- `app/(marketing)` — home · `app/(auth)` — login / forgot-password / onboarding
  · `app/(console)` — dashboard (session-gated) · `app/not-found.tsx` — 404
- `app/api/auth/password`, `app/api/auth/mfa`, `app/api/auth/select-partner` —
  real auth handlers
- `app/api/**` — remaining prototype handlers for onboarding / forgot-password /
  dashboard / SSO
- `lib/mock/` — prototype-only store and view types
- `app/_components` — brand marks, auth shell, provider button, account chip,
  locale switcher · `app/(auth)/_components` — shared auth-card bits

## i18n

All visible copy is routed through `@cloud/i18n` (`en` base, `zh-CN` / `ja`
overlays). The chrome and headings are translated in all three locales; longer
marketing/body prose falls back to English (the package's English-base design).
Switch language via the globe in the home nav / dashboard header.
